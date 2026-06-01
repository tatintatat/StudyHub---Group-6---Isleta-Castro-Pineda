<?php
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/AIService.php';
require_auth_api();

// Suppress any stray notices/warnings so they don't corrupt JSON output
@error_reporting(0);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_err('Method not allowed', 405); }
if (!isset($_FILES['file']))               { json_err('No file uploaded.'); }

$f        = $_FILES['file'];
$filename = $f['name'] ?? '';
$ext      = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
$allowed  = ['pdf', 'pptx', 'ppt'];

if (!$filename || !in_array($ext, $allowed)) {
    json_err('Only .pdf, .pptx, .ppt files are accepted.', 415);
}

$file_bytes = file_get_contents($f['tmp_name']);
if (strlen($file_bytes) > 20 * 1024 * 1024) {
    json_err('File exceeds the 20 MB limit.', 413);
}

$gen_type  = strtolower(trim($_POST['gen_type']  ?? 'flashcard'));
$quiz_type = strtolower(trim($_POST['quiz_type'] ?? 'mcq'));
$count     = max(3, min(50, (int)($_POST['count'] ?? 10)));

// ── Extract text from the uploaded file ──────────────────────────────────
$text = '';

if ($ext === 'pdf') {
    // Try pdftotext — safely check if shell_exec is usable
    $disabled = array_map('trim', explode(',', ini_get('disable_functions') ?: ''));
    $shell_ok  = function_exists('shell_exec') && !in_array('shell_exec', $disabled);
    if ($shell_ok) {
        $tmp = tempnam(sys_get_temp_dir(), 'pdf_');
        file_put_contents($tmp, $file_bytes);
        $out = @shell_exec('pdftotext ' . escapeshellarg($tmp) . ' - 2>/dev/null');
        @unlink($tmp);
        if ($out && strlen(trim($out)) > 60) {
            $text = trim($out);
        }
    }

    // Fallback 1: PDF BT/ET stream extraction
    if (!$text) {
        preg_match_all('/BT\s+(.*?)\s+ET/s', $file_bytes, $btMatches);
        $parts = [];
        foreach ($btMatches[1] as $bt) {
            preg_match_all('/\((.*?)\)\s*Tj/s', $bt, $tjMatches);
            foreach ($tjMatches[1] as $chunk) {
                $chunk = preg_replace('/\\\\([0-9]{3})/', '', $chunk);
                $chunk = str_replace(['\\n','\\r','\\t','\\(','\\)','\\\\'], [' ',' ',' ','(',')','\\'], $chunk);
                $chunk = trim($chunk);
                if ($chunk) $parts[] = $chunk;
            }
        }
        $text = implode(' ', $parts);
    }

    // Fallback 2: extract readable ASCII strings
    if (!$text || strlen(trim($text)) < 60) {
        preg_match_all('/[\x20-\x7E]{4,}/', $file_bytes, $m);
        $readable = array_filter($m[0], function($s) {
            return preg_match('/[a-zA-Z]{3,}/', $s);
        });
        $text = implode(' ', $readable);
    }
}

if (in_array($ext, ['pptx', 'ppt'])) {
    $tmp = tempnam(sys_get_temp_dir(), 'pptx_');
    file_put_contents($tmp, $file_bytes);
    $zip = new ZipArchive();
    if ($zip->open($tmp) === true) {
        $parts = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if (!preg_match('#^ppt/slides/slide[0-9]+\.xml$#', $name)) continue;
            $xml = $zip->getFromIndex($i);
            preg_match_all('/<a:t[^>]*>([^<]+)<\/a:t>/u', $xml, $m2);
            $slideText = implode(' ', array_map('trim', $m2[1]));
            $slideText = preg_replace('/\s+/', ' ', trim($slideText));
            if ($slideText) $parts[] = $slideText;
        }
        $zip->close();
        $text = mb_substr(implode("\n\n", $parts), 0, 18000);
    }
    @unlink($tmp);
}

if (!$text || strlen(trim($text)) < 60) {
    json_err('Could not extract enough text from the file. Make sure it contains readable text (not image-only).', 422);
}

$svc    = AIService::make();
$result = $svc->generateFromText(trim($text), $gen_type, $quiz_type, $count);

if (!$result['success']) { json_err($result['error'] ?? 'AI generation failed.', 422); }

json_ok([
    'items'    => $result['items'] ?? [],
    'provider' => 'Pollinations.AI',
]);
