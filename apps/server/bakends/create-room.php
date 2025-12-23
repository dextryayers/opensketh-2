<?php
include 'db.php';
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
  exit();
}

$roomId  = isset($_POST['room_id']) ? strtoupper(trim($_POST['room_id'])) : '';
$hostName = isset($_POST['host_name']) ? trim($_POST['host_name']) : '';

if ($roomId === '' || $hostName === '') {
  http_response_code(400);
  echo json_encode(["status" => "error", "message" => "Incomplete data"]);
  exit();
}
if (!preg_match('/^[A-Z0-9]{4,10}$/', $roomId)) {
  http_response_code(422);
  echo json_encode(["status" => "error", "message" => "Invalid room code"]);
  exit();
}

$stmt = $conn->prepare("INSERT INTO rooms (room_id, host_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE host_name = VALUES(host_name)");
$stmt->bind_param("ss", $roomId, $hostName);
$stmt->execute();

http_response_code(200);
echo json_encode(["status" => "success", "room_id" => $roomId, "host" => $hostName]);

$stmt->close();
$conn->close();