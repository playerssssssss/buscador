<?php
header('Content-Type: application/json; charset=utf-8');

$termino = isset($_GET['q']) ? trim($_GET['q']) : '';
$resultados = [];

if ($termino !== '') {
    try {
        // Conectar a la base de datos que llena el crawler de Python
        $db = new PDO('sqlite:buscador_global.db');
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Buscar el término dentro del título o del contenido de cualquier web rastreada
        $consulta = $db->prepare("SELECT url, titulo, contenido FROM paginas WHERE titulo LIKE :termino OR contenido LIKE :termino LIMIT 20");
        $parametro = "%" . $termino . "%";
        $consulta->bindParam(':termino', $parametro);
        $consulta->execute();

        while ($fila = $consulta->fetch(PDO::FETCH_ASSOC)) {
            // Recortar un fragmento del contenido real para usarlo como descripción
            $extracto = mb_substr(strip_tags($fila['contenido']), 0, 150, 'UTF-8');
            if (mb_strlen($fila['contenido'], 'UTF-8') > 150) {
                $extracto .= "...";
            }

            $resultados[] = [
                "titulo" => $fila['titulo'] ? $fila['titulo'] : $fila['url'],
                "url"    => $fila['url'],
                "desc"   => $extracto ? $extracto : "Sin descripción disponible para esta página."
            ];
        }
    } catch (Exception $e) {
        // En producción no se envían errores detallados al cliente por seguridad XHTML
    }
}

echo json_encode($resultados);
?>
