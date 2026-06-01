<?php
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/AIService.php';

// No auth required for health check
json_ok([
    'status'   => 'ok',
    'provider' => 'Pollinations.AI',
    'model'    => 'openai (free, no API key)',
    'api_key'  => false,
    'endpoint' => 'https://text.pollinations.ai/openai',
    'note'     => 'Powered by Pollinations.AI — free forever, no API key required.',
]);
