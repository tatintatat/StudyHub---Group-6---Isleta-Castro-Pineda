<?php
require_once __DIR__ . '/../../includes/helpers.php';
require_auth_api();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_err('Method not allowed', 405); }
if (!isset($_FILES['file']))               { json_err('No file uploaded.'); }

$f        = $_FILES['file'];
$filename = $f['name'] ?? '';
$ext      = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

if (!in_array($ext, ['pdf', 'pptx', 'ppt'])) {
    json_err('Only .pdf, .pptx, .ppt files are accepted.', 415);
}

$file_bytes = file_get_contents($f['tmp_name']);
if (strlen($file_bytes) > 20 * 1024 * 1024) {
    json_err('File exceeds the 20 MB limit.', 413);
}

$text = '';

if ($ext === 'pdf') {
    $tmp = tempnam(sys_get_temp_dir(), 'pdf_');
    file_put_contents($tmp, $file_bytes);
    $out = shell_exec('pdftotext ' . escapeshellarg($tmp) . ' - 2>/dev/null');
    @unlink($tmp);
    if ($out && strlen(trim($out)) > 10) {
        $text = trim($out);
    } else {
        preg_match_all('/BT\s+(.*?)\s+ET/s', $file_bytes, $btMatches);
        $parts = [];
        foreach ($btMatches[1] as $bt) {
            preg_match_all('/\((.*?)\)\s*Tj/s', $bt, $tjMatches);
            foreach ($tjMatches[1] as $chunk) {
                $chunk = str_replace(['\\n','\\r','\\t','\\(','\\)','\\\\'], [' ',' ',' ','(',')','\\'], $chunk);
                $chunk = trim($chunk);
                if ($chunk) $parts[] = $chunk;
            }
        }
        $text = implode(' ', $parts);
    }
}

if (in_array($ext, ['pptx', 'ppt'])) {
    $tmp = tempnam(sys_get_temp_dir(), 'pptx_');
    file_put_contents($tmp, $file_bytes);
    $zip   = new ZipArchive();
    if ($zip->open($tmp) === true) {
        $parts = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if (!preg_match('#^ppt/slides/slide[0-9]+\.xml$#', $name)) continue;
            $xml = $zip->getFromIndex($i);
            preg_match_all('/<a:t[^>]*>([^<]+)<\/a:t>/u', $xml, $m);
            $slideText = implode(' ', array_map('trim', $m[1]));
            $slideText = preg_replace('/\s+/', ' ', trim($slideText));
            if ($slideText) $parts[] = $slideText;
        }
        $zip->close();
        $text = mb_substr(implode("\n\n", $parts), 0, 18000);
    }
    @unlink($tmp);
}

json_ok(['text' => $text, 'char_count' => strlen($text)]);
