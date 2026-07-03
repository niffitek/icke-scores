<?php
require_once __DIR__ . '/../utils.php';

function handleRounds($method, $path, $conn) {
    if ($method === 'GET') {
        // Get rounds for a specific game or all rounds
        if (isset($_GET['game_id'])) {
            $game_id = $_GET['game_id'];
            $stmt = $conn->prepare("SELECT * FROM rounds WHERE game_id = ? ORDER BY round_number");
            $stmt->bind_param("s", $game_id);
            $stmt->execute();
            $result = $stmt->get_result();
        } else {
            $result = $conn->query("SELECT * FROM rounds ORDER BY game_id, round_number");
        }
        
        $rows = [];
        while ($row = $result->fetch_assoc()) $rows[] = $row;
        echo json_encode($rows);
        
    } elseif ($method === 'POST') {
        $data = getInput();
        
        // Generate id if not provided
        if (!isset($data['id']) || !$data['id']) {
            $data['id'] = uniqid('round_', true);
        }
        
        // Determine winner based on points
        $winner_team_id = null;
        if ($data['points_team_1'] > $data['points_team_2']) {
            $winner_team_id = $data['team_1_id'];
        } elseif ($data['points_team_2'] > $data['points_team_1']) {
            $winner_team_id = $data['team_2_id'];
        }
        
        $sql = "INSERT INTO rounds (id, game_id, round_number, points_team_1, points_team_2, winner_team_id) VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        
        if (!$stmt) {
            echo json_encode(['success' => false, 'error' => $conn->error]);
            return;
        }
        
        $stmt->bind_param(
            "ssiiis",
            $data['id'],
            $data['game_id'],
            $data['round_number'],
            $data['points_team_1'],
            $data['points_team_2'],
            $winner_team_id
        );
        
        $success = $stmt->execute();
        echo json_encode([
            'success' => $stmt->affected_rows > 0,
            'error' => $success ? null : $stmt->error
        ]);
        
    } elseif ($method === 'PUT') {
        $data = getInput();
        
        // First, get the round data to find the game_id
        $stmt = $conn->prepare("SELECT game_id FROM rounds WHERE id = ?");
        $stmt->bind_param("s", $data['id']);
        $stmt->execute();
        $result = $stmt->get_result();
        $round = $result->fetch_assoc();
        
        if (!$round) {
            echo json_encode(['success' => false, 'error' => 'Round not found']);
            return;
        }
        
        // Get the game data to find the team IDs
        $stmt = $conn->prepare("SELECT team_1_id, team_2_id FROM games WHERE id = ?");
        $stmt->bind_param("s", $round['game_id']);
        $stmt->execute();
        $result = $stmt->get_result();
        $game = $result->fetch_assoc();
        
        if (!$game) {
            echo json_encode(['success' => false, 'error' => 'Game not found']);
            return;
        }
        
        // Determine winner based on points using the correct team IDs
        $winner_team_id = null;
        if ($data['points_team_1'] > $data['points_team_2']) {
            $winner_team_id = $game['team_1_id'];
        } elseif ($data['points_team_2'] > $data['points_team_1']) {
            $winner_team_id = $game['team_2_id'];
        }
        
        $sql = "UPDATE rounds SET points_team_1 = ?, points_team_2 = ?, winner_team_id = ? WHERE id = ?";
        $stmt = $conn->prepare($sql);
        
        if (!$stmt) {
            echo json_encode(['success' => false, 'error' => $conn->error]);
            return;
        }
        
        $stmt->bind_param(
            "iiss",
            $data['points_team_1'],
            $data['points_team_2'],
            $winner_team_id,
            $data['id']
        );
        
        $success = $stmt->execute();
        echo json_encode([
            'success' => $stmt->affected_rows > 0,
            'error' => $success ? null : $stmt->error
        ]);
    }
}
?> 