<?php
require_once __DIR__ . '/../utils.php';

function handleGroups($method, $path, $conn) {
    if ($method === 'GET') {
        $tournamentId = $_GET['tournament_id'] ?? null;
        if ($tournamentId) {
            $stmt = $conn->prepare("SELECT * FROM groups WHERE tournament_id = ?");
            $stmt->bind_param("s", $tournamentId);
            $stmt->execute();
            $result = $stmt->get_result();
        } else {
            $result = $conn->query("SELECT * FROM groups");
        }
        $rows = [];
        while ($row = $result->fetch_assoc()) $rows[] = $row;
        echo json_encode($rows);
    } elseif ($method === 'POST') {
        $data = getInput();
        $stmt = $conn->prepare("INSERT INTO groups (id, tournament_id, name) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $data['id'], $data['tournament_id'], $data['name']);
        $stmt->execute();
        echo json_encode(['success' => $stmt->affected_rows > 0]);
    }
}
?> 