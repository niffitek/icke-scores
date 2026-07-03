<?php
// For production, use:
// header("Access-Control-Allow-Origin: https://ickecup.ickesports-sportmarketing.de/");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

// Handle preflight (OPTIONS) requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/utils.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/handlers/cups.php';
require_once __DIR__ . '/handlers/tournaments.php';
require_once __DIR__ . '/handlers/groups.php';
require_once __DIR__ . '/handlers/teams.php';
require_once __DIR__ . '/handlers/group_teams.php';
require_once __DIR__ . '/handlers/games.php';
require_once __DIR__ . '/handlers/rounds.php';

// Routing
$method = $_SERVER['REQUEST_METHOD'];
$path = explode('/', trim($_GET['path'] ?? '', '/'));

// --- LOGIN ENDPOINT ---
if ($_GET['path'] === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getInput();
    $password = $input['password'] ?? '';
    global $ADMIN_PASSWORD, $ADMIN_TOKEN;
    if ($password === $ADMIN_PASSWORD) {
        echo json_encode(['token' => $ADMIN_TOKEN]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid password']);
    }
    exit();
}

checkAuth($method, $path[0]);

switch ($path[0]) {
    case 'cups':
        handleCups($method, $path, $conn);
        break;
    case 'tournaments':
        handleTournaments($method, $path, $conn);
        break;
    case 'groups':
        handleGroups($method, $path, $conn);
        break;
    case 'teams':
        handleTeams($method, $path, $conn);
        break;
    case 'group_teams':
        handleGroupTeams($method, $path, $conn);
        break;
    case 'games':
        handleGames($method, $path, $conn);
        break;
    case 'rounds':
        handleRounds($method, $path, $conn);
        break;
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Not found']);
}

$conn->close();
?>
