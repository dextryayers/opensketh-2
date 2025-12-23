<?php
// CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit();
}

// Konfigurasi Database (SEBAIKNYA via .env/secret cPanel)
$servername = "localhost";
$username = "db_user";
$password = "db_pass";
$dbname   = "haniipps_drawing";

// Koneksi
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
try {
  $conn = new mysqli($servername, $username, $password, $dbname);
  $conn->set_charset("utf8mb4");
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["status" => "error", "message" => "Database connection failed"]);
  exit();
}
