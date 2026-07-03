<?php
require_once __DIR__ . '/../utils.php';

function handleGames($method, $path, $conn) {
    if ($method === 'GET') {
        // Get games with their rounds data
        $result = $conn->query("
            SELECT g.*, 
                   r1.points_team_1 as round1_points_team_1, r1.points_team_2 as round1_points_team_2, r1.winner_team_id as round1_winner,
                   r2.points_team_1 as round2_points_team_1, r2.points_team_2 as round2_points_team_2, r2.winner_team_id as round2_winner
            FROM games g
            LEFT JOIN rounds r1 ON g.id = r1.game_id AND r1.round_number = 1
            LEFT JOIN rounds r2 ON g.id = r2.game_id AND r2.round_number = 2
            ORDER BY g.start_at
        ");
        $rows = [];
        while ($row = $result->fetch_assoc()) $rows[] = $row;
        echo json_encode($rows);
    } elseif ($method === 'POST') {
        $data = getInput();
        // Debug: log incoming data
        file_put_contents(__DIR__ . '/games_debug.log', "Incoming data: " . print_r($data, true) . "\n", FILE_APPEND);
        // Generate id if not provided
        if (!isset($data['id']) || !$data['id']) {
            $data['id'] = uniqid('game_', true);
        }
        $sql = "INSERT INTO games (id, team_1_id, team_2_id, ref_team_id, points_team_1, points_team_2, start_at, tournament_id, round, sitting, court) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        file_put_contents(__DIR__ . '/games_debug.log', "SQL: $sql\n", FILE_APPEND);
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            file_put_contents(__DIR__ . '/games_debug.log', "Prepare failed: " . $conn->error . "\n", FILE_APPEND);
            echo json_encode(['success' => false, 'error' => $conn->error]);
            return;
        }
        $stmt->bind_param(
            "ssssissssii",
            $data['id'],
            $data['team_1_id'],
            $data['team_2_id'],
            $data['ref_team_id'],
            $data['points_team_1'],
            $data['points_team_2'],
            $data['start_at'],
            $data['tournament_id'],
            $data['round'],
            $data['sitting'],
            $data['court']
        );
        $success = $stmt->execute();
        if (!$success) {
            file_put_contents(__DIR__ . '/games_debug.log', "Execute failed: " . $stmt->error . "\n", FILE_APPEND);
        }
        
        // If game creation was successful, create two default rounds
        if ($success && $stmt->affected_rows > 0) {
            // Create round 1
            $round1_id = uniqid('round_', true);
            $round1_sql = "INSERT INTO rounds (id, game_id, round_number, points_team_1, points_team_2, winner_team_id) VALUES (?, ?, 1, 0, 0, NULL)";
            $round1_stmt = $conn->prepare($round1_sql);
            $round1_stmt->bind_param("ss", $round1_id, $data['id']);
            $round1_stmt->execute();
            
            // Create round 2
            $round2_id = uniqid('round_', true);
            $round2_sql = "INSERT INTO rounds (id, game_id, round_number, points_team_1, points_team_2, winner_team_id) VALUES (?, ?, 2, 0, 0, NULL)";
            $round2_stmt = $conn->prepare($round2_sql);
            $round2_stmt->bind_param("ss", $round2_id, $data['id']);
            $round2_stmt->execute();
        }
        
        echo json_encode([
            'success' => $stmt->affected_rows > 0,
            'error' => $success ? null : $stmt->error
        ]);
    }
}
?> 