<?php
require_once __DIR__ . '/../utils.php';

function handleTeams($method, $path, $conn) {
    if ($method === 'GET') {
        $result = $conn->query("SELECT * FROM teams");
        $rows = [];
        while ($row = $result->fetch_assoc()) $rows[] = $row;
        echo json_encode($rows);
    } elseif ($method === 'POST') {
        $data = getInput();
        $stmt = $conn->prepare("INSERT INTO teams (id, name, contact, place, final_place, icke_cup_id) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssiss", $data['id'], $data['name'], $data['contact'], $data['place'], $data['final_place'], $data['icke_cup_id']);
        $stmt->execute();
        echo json_encode(['success' => $stmt->affected_rows > 0]);
    } elseif ($method === 'PUT') {
        $data = getInput();
        if (!isset($data['id'], $data['name'], $data['contact'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            return;
        }
        // Optionally allow updating final_place if provided
        if (isset($data['final_place'])) {
            $stmt = $conn->prepare("UPDATE teams SET name = ?, contact = ?, final_place = ? WHERE id = ?");
            if (!$stmt) {
                http_response_code(500);
                echo json_encode(['error' => 'Prepare failed', 'mysql_error' => $conn->error]);
                return;
            }
            $stmt->bind_param("ssis", $data['name'], $data['contact'], $data['final_place'], $data['id']);
        } else {
            $stmt = $conn->prepare("UPDATE teams SET name = ?, contact = ? WHERE id = ?");
            if (!$stmt) {
                http_response_code(500);
                echo json_encode(['error' => 'Prepare failed', 'mysql_error' => $conn->error]);
                return;
            }
            $stmt->bind_param("sss", $data['name'], $data['contact'], $data['id']);
        }
        if (!$stmt->execute()) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update team', 'mysql_error' => $stmt->error]);
            return;
        }
        echo json_encode(['success' => true]);
    } elseif ($method === 'DELETE') {
        $teamId = $_GET['id'] ?? null;
        if (!$teamId) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing team id']);
            return;
        }
        $stmt = $conn->prepare("DELETE FROM teams WHERE id = ?");
        if (!$stmt) {
            http_response_code(500);
            echo json_encode(['error' => 'Prepare failed', 'mysql_error' => $conn->error]);
            return;
        }
        $stmt->bind_param("s", $teamId);
        if (!$stmt->execute()) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete team', 'mysql_error' => $stmt->error]);
            return;
        }
        echo json_encode(['success' => true]);
    }
}
?> 