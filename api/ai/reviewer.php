<?php
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/AIService.php';
require_auth_api();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_err('Method not allowed', 405); }

$body = get_json_body();
$text = trim($body['text'] ?? '');
if (!$text) { json_err('No text provided.'); }

$svc      = AIService::make();
$result   = $svc->generateReviewer($text);

if (!$result['success']) { json_err($result['error'] ?? 'Generation failed.', 422); }

$reviewer = $result['items'][0] ?? [];
json_ok(['reviewer' => $reviewer]);
