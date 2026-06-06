<?php
require_once __DIR__ . '/config.php';
if (($_GET['key'] ?? '') !== SECRET_KEY) { http_response_code(404); exit; }

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

define('DATA_DIR', __DIR__ . '/data');

$VALID_TYPES = ['water', 'electricity', 'gas'];
$type = $_GET['type'] ?? '';
if (!in_array($type, $VALID_TYPES, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Ungültiger Typ. Erlaubt: water, electricity, gas']);
    exit;
}

$dataFile     = DATA_DIR . '/' . $type . '.json';
$contractFile = DATA_DIR . '/contracts_' . $type . '.json';

function loadReadings(string $file): array {
    if (!file_exists($file)) return [];
    return json_decode(file_get_contents($file), true) ?? [];
}

function saveReadings(array $readings, string $file): void {
    if (!is_dir(DATA_DIR)) mkdir(DATA_DIR, 0775, true);
    if (file_put_contents($file, json_encode($readings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX) === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Fehler beim Speichern der Daten']);
        exit;
    }
}

function generateUUID(): string {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function roundToSlot(string $datetime): string {
    $dt = new DateTime($datetime);
    $hour = (int)$dt->format('G');
    if      ($hour < 2)  { $slot = 0;  $addDay = false; }
    elseif  ($hour < 6)  { $slot = 4;  $addDay = false; }
    elseif  ($hour < 10) { $slot = 8;  $addDay = false; }
    elseif  ($hour < 14) { $slot = 12; $addDay = false; }
    elseif  ($hour < 18) { $slot = 16; $addDay = false; }
    elseif  ($hour < 22) { $slot = 20; $addDay = false; }
    else                 { $slot = 0;  $addDay = true;  }
    if ($addDay) $dt->modify('+1 day');
    $dt->setTime($slot, 0, 0);
    return $dt->format('Y-m-d\TH:i:s');
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        $readings = loadReadings($dataFile);
        usort($readings, fn($a, $b) => strcmp($a['timestamp'], $b['timestamp']));
        echo json_encode($readings);
        break;

    case 'add':
        $body = json_decode(file_get_contents('php://input'), true);
        if (!$body || !isset($body['timestamp'], $body['reading'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Fehlende Felder: timestamp und reading erforderlich']);
            exit;
        }
        if (!is_numeric($body['reading'])) {
            http_response_code(400);
            echo json_encode(['error' => 'reading muss eine Zahl sein']);
            exit;
        }

        $readings = loadReadings($dataFile);

        if ($type === 'water') {
            $timestamp = roundToSlot($body['timestamp']);
            foreach ($readings as $r) {
                if ($r['timestamp'] === $timestamp) {
                    http_response_code(409);
                    echo json_encode(['error' => 'Für diesen Zeitslot existiert bereits ein Eintrag']);
                    exit;
                }
            }
        } else {
            $date      = substr($body['timestamp'], 0, 10);
            $timestamp = $date . 'T00:00:00';
            foreach ($readings as $r) {
                if (substr($r['timestamp'], 0, 10) === $date) {
                    http_response_code(409);
                    echo json_encode(['error' => 'Für diesen Tag existiert bereits ein Eintrag']);
                    exit;
                }
            }
        }

        $entry = [
            'id'        => generateUUID(),
            'timestamp' => $timestamp,
            'reading'   => round((float)$body['reading'], 3),
            'comment'   => trim($body['comment'] ?? ''),
        ];
        $readings[] = $entry;
        saveReadings($readings, $dataFile);
        http_response_code(201);
        echo json_encode($entry);
        break;

    case 'delete':
        $id = $_GET['id'] ?? '';
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'id fehlt']);
            exit;
        }
        $readings = loadReadings($dataFile);
        $filtered = array_values(array_filter($readings, fn($r) => $r['id'] !== $id));
        if (count($filtered) === count($readings)) {
            http_response_code(404);
            echo json_encode(['error' => 'Eintrag nicht gefunden']);
            exit;
        }
        saveReadings($filtered, $dataFile);
        echo json_encode(['success' => true]);
        break;

    case 'list_contracts':
        $contracts = loadReadings($contractFile);
        usort($contracts, fn($a, $b) => strcmp($b['valid_from'], $a['valid_from']));
        echo json_encode($contracts);
        break;

    case 'save_contract':
        $body = json_decode(file_get_contents('php://input'), true);
        if (!$body || !isset($body['valid_from'], $body['base_monthly'], $body['unit_price'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Fehlende Felder: valid_from, base_monthly, unit_price erforderlich']);
            exit;
        }
        if (!is_numeric($body['base_monthly']) || !is_numeric($body['unit_price'])) {
            http_response_code(400);
            echo json_encode(['error' => 'base_monthly und unit_price müssen Zahlen sein']);
            exit;
        }
        $contracts = loadReadings($contractFile);
        $entry = [
            'id'           => generateUUID(),
            'valid_from'   => substr($body['valid_from'], 0, 10),
            'valid_to'     => (isset($body['valid_to']) && $body['valid_to'] !== '') ? substr($body['valid_to'], 0, 10) : null,
            'base_monthly' => round((float)$body['base_monthly'], 2),
            'unit_price'   => round((float)$body['unit_price'], 4),
            'comment'      => substr(trim($body['comment'] ?? ''), 0, 300),
        ];
        $contracts[] = $entry;
        saveReadings($contracts, $contractFile);
        http_response_code(201);
        echo json_encode($entry);
        break;

    case 'update_contract':
        $id = $_GET['id'] ?? '';
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'id fehlt']);
            exit;
        }
        $body = json_decode(file_get_contents('php://input'), true);
        if (!$body || !isset($body['valid_from'], $body['base_monthly'], $body['unit_price'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Fehlende Felder: valid_from, base_monthly, unit_price erforderlich']);
            exit;
        }
        if (!is_numeric($body['base_monthly']) || !is_numeric($body['unit_price'])) {
            http_response_code(400);
            echo json_encode(['error' => 'base_monthly und unit_price müssen Zahlen sein']);
            exit;
        }
        $contracts = loadReadings($contractFile);
        $found = false;
        foreach ($contracts as &$c) {
            if ($c['id'] === $id) {
                $c['valid_from']   = substr($body['valid_from'], 0, 10);
                $c['valid_to']     = (isset($body['valid_to']) && $body['valid_to'] !== '') ? substr($body['valid_to'], 0, 10) : null;
                $c['base_monthly'] = round((float)$body['base_monthly'], 2);
                $c['unit_price']   = round((float)$body['unit_price'], 4);
                $c['comment']      = substr(trim($body['comment'] ?? ''), 0, 300);
                $found = true;
                break;
            }
        }
        unset($c);
        if (!$found) {
            http_response_code(404);
            echo json_encode(['error' => 'Vertrag nicht gefunden']);
            exit;
        }
        saveReadings($contracts, $contractFile);
        echo json_encode(['success' => true]);
        break;

    case 'delete_contract':
        $id = $_GET['id'] ?? '';
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'id fehlt']);
            exit;
        }
        $contracts = loadReadings($contractFile);
        $filtered  = array_values(array_filter($contracts, fn($c) => $c['id'] !== $id));
        if (count($filtered) === count($contracts)) {
            http_response_code(404);
            echo json_encode(['error' => 'Vertrag nicht gefunden']);
            exit;
        }
        saveReadings($filtered, $contractFile);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Unbekannte Aktion: ' . htmlspecialchars($action)]);
}
