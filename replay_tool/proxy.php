<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    $token = $data['token'] ?? '';
    $payload = $data['payload'] ?? [];

    if (empty($token)) {
        echo json_encode(['error' => 'Missing authorization token']);
        exit;
    }

    $ch = curl_init('https://api.monkeytype.com/results'); // Original endpoint

    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $token,
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
        'Accept: application/json',
        'Origin: https://monkeytype.com',
        'Referer: https://monkeytype.com/',
        'X-Client-Version: 26.14.0'
    ];

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['result' => $payload]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        echo json_encode(['error' => curl_error($ch)]);
    } else {
        http_response_code($httpcode);
        echo $response;
    }

    curl_close($ch);
} else {
    echo json_encode(['error' => 'Invalid request method']);
}
?>