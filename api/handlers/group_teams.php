<?php
require_once __DIR__ . '/../utils.php';

function handleGroupTeams($method, $path, $conn) {
    if ($method === 'GET') {
        $result = $conn->query("SELECT * FROM group_teams");
        $rows = [];
        while ($row = $result->fetch_assoc()) $rows[] = $row;
        echo json_encode($rows);
    } elseif ($method === 'POST') {
        $data = getInput();
        $stmt = $conn->prepare("INSERT INTO group_teams (group_id, team_id) VALUES (?, ?)");
        $stmt->bind_param("ss", $data['group_id'], $data['team_id']);
        $stmt->execute();
        echo json_encode(['success' => $stmt->affected_rows > 0]);
    } elseif ($method === 'DELETE') {
        $teamId = $_GET['team_id'] ?? null;
        if ($teamId) {
            $stmt = $conn->prepare("DELETE FROM group_teams WHERE team_id = ?");
            $stmt->bind_param("s", $teamId);
            $stmt->execute();
            echo json_encode(['success' => $stmt->affected_rows > 0]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Missing team_id']);
        }
    }
}
?> 