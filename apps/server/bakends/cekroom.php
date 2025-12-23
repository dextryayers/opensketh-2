<?php
include 'db.php';
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  http_response_code(405);
  echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
  exit();
}

$roomId = isset($_GET['room_id']) ? strtoupper(trim($_GET['room_id'])) : '';
if ($roomId === '') {
  http_response_code(400);
  echo json_encode(["status" => "error", "message" => "No Room ID provided"]);
  exit();
}
if (!preg_match('/^[A-Z0-9]{4,10}$/', $roomId)) {
  http_response_code(422);
  echo json_encode(["status" => "error", "message" => "Invalid room code"]);
  exit();
}

$stmt = $conn->prepare("SELECT host_name FROM rooms WHERE room_id = ?");
$stmt->bind_param("s", $roomId);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
  http_response_code(200);
  echo json_encode(["status" => "success", "exists" => true, "host_name" => $row['host_name']]);
} else {
  http_response_code(404);
  echo json_encode(["status" => "success", "exists" => false, "message" => "Room not found"]);
}

$stmt->close();
$conn->close();