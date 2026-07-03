<?php
require_once __DIR__ . '/../utils.php';

function handleCups($method, $path, $conn) {
    if ($method === 'GET') {
        $result = $conn->query("SELECT * FROM icke_cups");
        $cups = [];
        while ($row = $result->fetch_assoc()) $cups[] = $row;
        echo json_encode($cups);
    } elseif ($method === 'POST') {
        try {
            $data = getInput();
            // 1. Create Cup
            $stmt = $conn->prepare("INSERT INTO icke_cups (id, created_at, title, address, state) VALUES (?, ?, ?, ?, ?)");
            $state = "Bevorstehend";
            $stmt->bind_param("sssss", $data['id'], $data['created_at'], $data['title'], $data['address'], $state);
            if (!$stmt->execute()) {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to create cup', 'mysql_error' => $stmt->error]);
                return;
            }

            // 2. Create Tournaments
            $tournament_ids = [];
            foreach ([true, false] as $sitting) {
                $tournament_id = guidv4();
                $tournament_ids[] = $tournament_id;
                $stmt = $conn->prepare("INSERT INTO tournaments (id, icke_cup_id, sitting) VALUES (?, ?, ?)");
                $stmt->bind_param("ssi", $tournament_id, $data['id'], $sitting);
                if (!$stmt->execute()) {
                    http_response_code(500);
                    echo json_encode(['error' => 'Failed to create tournament', 'mysql_error' => $stmt->error]);
                    return;
                }
            }

            // 3. Create Groups (A, B, C, D for each tournament)
            $group_ids = [];
            foreach ($tournament_ids as $tournament_id) {
                foreach (['A', 'B', 'C', 'D'] as $group_name) {
                    $group_id = guidv4();
                    $group_ids[$tournament_id][$group_name] = $group_id;
                    $stmt = $conn->prepare("INSERT INTO groups (id, tournament_id, name) VALUES (?, ?, ?)");
                    $stmt->bind_param("sss", $group_id, $tournament_id, $group_name);
                    if (!$stmt->execute()) {
                        http_response_code(500);
                        echo json_encode(['error' => 'Failed to create group', 'mysql_error' => $stmt->error]);
                        return;
                    }
                }
            }

            echo json_encode(['success' => true]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Exception', 'message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
        }
    } elseif ($method === 'PUT') {
        $data = getInput();
        if (!isset($data['id'], $data['title'], $data['address'], $data['state'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            return;
        }
        $stmt = $conn->prepare("UPDATE icke_cups SET title = ?, address = ?, state = ? WHERE id = ?");
        if (!$stmt) {
            http_response_code(500);
            echo json_encode(['error' => 'Prepare failed', 'mysql_error' => $conn->error]);
            return;
        }
        $stmt->bind_param("ssss", $data['title'], $data['address'], $data['state'], $data['id']);
        if (!$stmt->execute()) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update cup', 'mysql_error' => $stmt->error]);
            return;
        }
        echo json_encode(['success' => true]);
    } elseif ($method === 'DELETE') {
        ini_set('display_errors', 1);
        ini_set('display_startup_errors', 1);
        error_reporting(E_ALL);

        $cupId = $_GET['id'] ?? null;
        if (!$cupId) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing cup id']);
            return;
        }

        if (!$conn) {
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed']);
            return;
        }

        // Start transaction for cascading delete
        $conn->begin_transaction();
        
        try {
            // 1. Get all tournaments for this cup
            $stmt = $conn->prepare("SELECT id FROM tournaments WHERE icke_cup_id = ?");
            $stmt->bind_param("s", $cupId);
            $stmt->execute();
            $result = $stmt->get_result();
            $tournamentIds = [];
            while ($row = $result->fetch_assoc()) {
                $tournamentIds[] = $row['id'];
            }
            
            if (!empty($tournamentIds)) {
                $tournamentIdsStr = "'" . implode("','", $tournamentIds) . "'";
                
                // 2. Get all games for these tournaments
                $stmt = $conn->prepare("SELECT id FROM games WHERE tournament_id IN ($tournamentIdsStr)");
                $stmt->execute();
                $result = $stmt->get_result();
                $gameIds = [];
                while ($row = $result->fetch_assoc()) {
                    $gameIds[] = $row['id'];
                }
                
                if (!empty($gameIds)) {
                    $gameIdsStr = "'" . implode("','", $gameIds) . "'";
                    
                    // 3. Delete rounds for these games
                    $stmt = $conn->prepare("DELETE FROM rounds WHERE game_id IN ($gameIdsStr)");
                    $stmt->execute();
                }
                
                // 4. Delete games for these tournaments
                $stmt = $conn->prepare("DELETE FROM games WHERE tournament_id IN ($tournamentIdsStr)");
                $stmt->execute();
                
                // 5. Delete group_teams for these tournaments (via groups)
                $stmt = $conn->prepare("DELETE gt FROM group_teams gt 
                                      INNER JOIN groups g ON gt.group_id = g.id 
                                      WHERE g.tournament_id IN ($tournamentIdsStr)");
                $stmt->execute();
                
                // 6. Delete groups for these tournaments
                $stmt = $conn->prepare("DELETE FROM groups WHERE tournament_id IN ($tournamentIdsStr)");
                $stmt->execute();
            }
            
            // 7. Delete tournaments for this cup
            $stmt = $conn->prepare("DELETE FROM tournaments WHERE icke_cup_id = ?");
            $stmt->bind_param("s", $cupId);
            $stmt->execute();
            
            // 8. Delete teams for this cup
            $stmt = $conn->prepare("DELETE FROM teams WHERE icke_cup_id = ?");
            $stmt->bind_param("s", $cupId);
            $stmt->execute();
            
            // 9. Finally, delete the cup itself
            $stmt = $conn->prepare("DELETE FROM icke_cups WHERE id = ?");
            $stmt->bind_param("s", $cupId);
            $stmt->execute();
            
            // Commit the transaction
            $conn->commit();
            
            echo json_encode(['success' => true]);
            
        } catch (Exception $e) {
            // Rollback on error
            $conn->rollback();
            error_log("Cascading delete error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete cup and related data', 'message' => $e->getMessage()]);
        }
    }
}
?> 