<?php
require_once __DIR__ . '/../includes/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_err('Method not allowed', 405); }

// 1. Clear all session variables first
$_SESSION = [];

// 2. Delete the session cookie from the browser so the ID cannot be reused
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(), '', time() - 42000,
        $params['path'], $params['domain'],
        $params['secure'], $params['httponly']
    );
}

// 3. Destroy the server-side session file
session_destroy();

json_ok(['redirect' => '/']);
