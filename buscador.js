window.onload = function() {
    var formulario = document.getElementById("formulario-busqueda");

    if (!formulario) {
        return;
    }

    formulario.onsubmit = function(evento) {
        // Detener el envío clásico del formulario
        if (evento && evento.preventDefault) {
            evento.preventDefault();
        } else if (window.event) {
            window.event.returnValue = false;
        }

        var termino = document.getElementById("termino").value;
        var contenedorResultados = document.getElementById("resultados");

        // Limpieza previa del contenedor de resultados
        while (contenedorResultados.firstChild) {
            contenedorResultados.removeChild(contenedorResultados.firstChild);
        }

        // Validar que el usuario no envíe el campo vacío
        if (termino.replace(/^\s+|\s+$/g, '') === "") {
            var mensajeAviso = document.createElement("p");
            mensajeAviso.appendChild(document.createTextNode("Por favor, escribe un término para buscar."));
            contenedorResultados.appendChild(mensajeAviso);
            return false;
        }

        // Mostrar estado de carga en texto plano
        var cargando = document.createElement("p");
        cargando.appendChild(document.createTextNode("Buscando en la base de datos global..."));
        contenedorResultados.appendChild(cargando);

        // Instanciar la conexión asíncrona nativa
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "buscar.php?q=" + encodeURIComponent(termino), true);

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                // Eliminar el mensaje de "Buscando..."
                while (contenedorResultados.firstChild) {
                    contenedorResultados.removeChild(contenedorResultados.firstChild);
                }

                // Verificar si el servidor respondió correctamente (Código HTTP 200)
                if (xhr.status === 200) {
                    try {
                        // Parseo seguro compatible con JS 1.7
                        var respuestas = eval('(' + xhr.responseText + ')');

                        if (!respuestas || respuestas.length === 0) {
                            var sinResultados = document.createElement("p");
                            sinResultados.appendChild(document.createTextNode("No se encontraron páginas indexadas para esa consulta."));
                            contenedorResultados.appendChild(sinResultados);
                            return;
                        }

                        // Renderizar las páginas web reales encontradas por el crawler
                        for (var i = 0; i < respuestas.length; i++) {
                            var item = respuestas[i];

                            var divItem = document.createElement("div");
                            divItem.className = "resultado-item";

                            var h3 = document.createElement("h3");
                            var enlace = document.createElement("a");
                            enlace.setAttribute("href", item.url);
                            enlace.appendChild(document.createTextNode(item.titulo));
                            h3.appendChild(enlace);

                            var p = document.createElement("p");
                            p.appendChild(document.createTextNode(item.desc));

                            divItem.appendChild(h3);
                            divItem.appendChild(p);
                            contenedorResultados.appendChild(divItem);
                        }
                    } catch (error_parseo) {
                        // Error si el PHP devuelve algo que no es JSON válido
                        var msgErrorJson = document.createElement("p");
                        msgErrorJson.appendChild(document.createTextNode("Error: El servidor devolvió una respuesta inválida. Asegúrate de que buscar.php funcione correctamente."));
                        contenedorResultados.appendChild(msgErrorJson);
                    }
                } else {
                    // Error si no se encuentra el archivo PHP o el servidor está caído
                    var msgErrorRed = document.createElement("p");
                    msgErrorRed.appendChild(document.createTextNode("Error de conexión: No se pudo contactar con el servidor (Código HTTP: " + xhr.status + "). Ejecuta el proyecto en un servidor web local."));
                    contenedorResultados.appendChild(msgErrorRed);
                }
            }
        };

        xhr.send(null);
        return false;
    };
};
