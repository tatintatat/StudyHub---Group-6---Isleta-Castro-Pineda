<?php
require_once __DIR__ . "/../../includes/helpers.php";
@error_reporting(0);
require_once __DIR__ . '/../../includes/AIService.php';
require_auth_api();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_err('Method not allowed', 405); }

$body      = get_json_body();
$text      = trim($body['text']      ?? '');
$gen_type  = strtolower(trim($body['gen_type']  ?? 'flashcard'));
$quiz_type = strtolower(trim($body['quiz_type'] ?? 'mcq'));
$count     = max(3, min(50, (int)($body['count'] ?? 10)));

if (!$text) { json_err('No text provided.'); }

$svc    = AIService::make();
$result = $svc->generateFromText($text, $gen_type, $quiz_type, $count);

if (!$result['success']) { json_err($result['error'] ?? 'AI generation failed.', 422); }

json_ok([
    'items'    => $result['items'] ?? [],
    'provider' => 'Pollinations.AI',
]);
