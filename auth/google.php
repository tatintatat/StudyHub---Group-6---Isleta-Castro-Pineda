<?php
require_once __DIR__ . '/../includes/config.php';

$params = http_build_query([
    'client_id'     => GOOGLE_CLIENT_ID,
    'redirect_uri'  => GOOGLE_REDIRECT_URI,
    'response_type' => 'code',
    'scope'         => 'openid email profile',
    'access_type'   => 'offline',
]);

header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $params);
exit;
