<?php
require_once __DIR__ . '/../utils.php';

function handleTournaments($method, $path, $conn) {
    if ($method === 'GET') {
        $result = $conn->query("SELECT * FROM tournaments");
        $rows = [];
        while ($row = $result->fetch_assoc()) $rows[] = $row;
        echo json_encode($rows);
    } elseif ($method === 'POST') {
        $data = getInput();
        $stmt = $conn->prepare("INSERT INTO tournaments (id, icke_cup_id, sitting) VALUES (?, ?, ?)");
        $stmt->bind_param("ssi", $data['id'], $data['icke_cup_id'], $data['sitting']);
        $stmt->execute();
        echo json_encode(['success' => $stmt->affected_rows > 0]);
    }
}
?> 