# Mini Buscador Educativo

**Perl** (crawler) + **JSON** (índice) + **JavaScript** (búsqueda)

Versión simple y educativa de un motor de búsqueda con crawler propio.

## Características

- Crawler escrito en **Perl**
- Índice guardado en **JSON**
- Búsqueda completamente en el navegador con **JavaScript**
- Respeta `robots.txt` (versión básica)
- Solo sigue enlaces del mismo dominio
- Límites de profundidad y número de páginas
- Ranking simple (el título pesa más)
- Snippets con términos resaltados

## Estructura

```
mini-buscador/
├── crawler.pl          ← Crawler en Perl
├── data/
│   └── index.json      ← Índice (se genera al crawlear)
├── public/
│   ├── index.html      ← Interfaz
│   └── search.js       ← Lógica de búsqueda
└── README.md
```

## Requisitos

### Para el crawler (Perl):
```bash
cpanm LWP::UserAgent HTML::TreeBuilder JSON::PP URI File::Slurp
```

O en Debian/Ubuntu:
```bash
sudo apt install libwww-perl libhtml-tree-perl libjson-pp-perl liburi-perl libfile-slurp-perl
```

## Uso

### 1. Crawlear un sitio

```bash
perl crawler.pl --url https://example.com
```

Opciones:
- `--max 40`     → máximo de páginas (por defecto 40)
- `--depth 2`    → profundidad máxima
- `--delay 1`    → segundos entre peticiones

### 2. Ver el buscador

Sirve la carpeta `public` y asegúrate de que pueda leer `../data/index.json`.

Con el servidor integrado de Python:
```bash
cd public
python3 -m http.server 8000
```

Luego abre: http://localhost:8000

## Limitaciones

- Es un proyecto **educativo**.
- No está pensado para indexar grandes cantidades de páginas ni “toda la web”.
- El parser de robots.txt es muy básico.
- No hay ranking avanzado (PageRank, etc.).

---

Hecho por **Grok** · xAI · 2026
