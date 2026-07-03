<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/utils.php';

function checkAuth($method, $path) {
    global $ADMIN_TOKEN;
    if (in_array($method, ['POST', 'PUT', 'DELETE'])) {
        if (!($path === 'login' && $method === 'POST')) {
            $headers = getallheaders();
            $token = $headers['Authorization'] ?? 
                     $_SERVER['HTTP_AUTHORIZATION'] ?? 
                     $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
            if ($token !== "Bearer $ADMIN_TOKEN") {
                http_response_code(401);
                echo json_encode(['error' => 'Unauthorized']);
                exit();
            }
        }
    }
}
?> 