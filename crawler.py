# -*- coding: utf-8 -*-
import urllib2
import urlparse
import sqlite3
from HTMLParser import HTMLParser

# Base de datos local para guardar todo Internet descubierto
conexion_bd = sqlite3.connect('buscador_global.db')
cursor = conexion_bd.cursor()

# Crear las tablas del motor de búsqueda si no existen
cursor.execute('''CREATE TABLE IF NOT EXISTS paginas
                  (url TEXT PRIMARY KEY, titulo TEXT, contenido TEXT)''')
cursor.execute('''CREATE TABLE IF NOT EXISTS cola_rastreo
                  (url TEXT PRIMARY KEY, visitada INTEGER DEFAULT 0)''')
conexion_bd.commit()

class AnalizadorGlobal(HTMLParser):
    def __init__(self, url_base):
        HTMLParser.__init__(self)
        self.url_base = url_base
        self.enlaces_encontrados = []
        self.texto_acumulado = []
        self.titulo = "Sitio sin Título"
        self.en_titulo = False
        self.guardar_texto = False

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            for nombre, valor in attrs:
                if nombre == 'href':
                    # Convertir enlaces relativos (/contacto) en absolutos (http://...)
                    url_completa = urlparse.urljoin(self.url_base, valor)
                    if url_completa.startswith('http'):
                        self.enlaces_encontrados.append(url_completa)
        if tag == 'title':
            self.en_titulo = True
        if tag in ['p', 'h1', 'h2', 'h3', 'article']:
            self.guardar_texto = True

    def handle_endtag(self, tag):
        if tag == 'title':
            self.en_titulo = False
        if tag in ['p', 'h1', 'h2', 'h3', 'article']:
            self.guardar_texto = False

    def handle_data(self, data):
        if self.en_titulo:
            self.titulo = data.strip()
        if self.guardar_texto and len(data.strip()) > 5:
            self.texto_acumulado.append(data.strip())

def iniciar_sistema():
    # Semilla inicial para romper el hielo si la base de datos está vacía
    cursor.execute("SELECT COUNT(*) FROM cola_rastreo")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO cola_rastreo (url, visitada) VALUES ('https://w3.org', 0)")
        conexion_bd.commit()

    # Bucle infinito: Rastrea de forma expansiva todo Internet
    while True:
        # Extraer la siguiente URL de la cola que no haya sido visitada
        cursor.execute("SELECT url FROM cola_rastreo WHERE visitada = 0 LIMIT 1")
        fila = cursor.fetchone()

        if not fila:
            print "Se ha terminado la cola de rastreo disponible."
            break

        url_actual = fila[0]
        print "Rastreando de forma global: " + url_actual

        # Marcar inmediatamente como visitada para evitar bucles si falla
        cursor.execute("UPDATE cola_rastreo SET visitada = 1 WHERE url = ?", (url_actual,))
        conexion_bd.commit()

        peticion = urllib2.Request(url_actual)
        peticion.add_header('User-Agent', 'Mozilla/5.0 (BuscadorEstrictoBot/1.0)')

        try:
            # Descargar HTML puro de la web real de turno
            respuesta = urllib2.urlopen(peticion, timeout=5)
            html_puro = respuesta.read()

            parser = AnalizadorGlobal(url_actual)
            parser.feed(html_puro)

            texto_limpio = " ".join(parser.texto_acumulado)

            # 1. Guardar la página indexada con su texto completo para las búsquedas del usuario
            cursor.execute("INSERT OR REPLACE INTO paginas (url, titulo, contenido) VALUES (?, ?, ?)",
                           (url_actual, parser.titulo, texto_limpio))

            # 2. Inyectar todos los enlaces nuevos encontrados en la cola global de rastreo
            for enlace in parser.enlaces_encontrados:
                try:
                    # Si el enlace ya existe, 'INSERT OR IGNORE' no lo duplica
                    cursor.execute("INSERT OR IGNORE INTO cola_rastreo (url, visitada) VALUES (?, 0)", (enlace,))
                except:
                    pass

            conexion_bd.commit()
            print "-> Indexada con éxito. Enlaces nuevos añadidos a la cola: " + str(len(parser.enlaces_encontrados))

        except Exception as e:
            print "-> Saltando web inaccesible o protegida: ", e

iniciar_sistema()
