<?php
// ── AIService.php ─────────────────────────────────────────────────────────
// Uses Pollinations.AI — completely FREE, no API key, no sign-up required.
// Endpoint: https://text.pollinations.ai/openai  (OpenAI-compatible REST)
// 100% Pollinations.AI — zero configuration needed.

class AIService {

    private string $endpoint  = 'https://text.pollinations.ai/openai';
    private string $model     = 'openai';       // Pollinations free model (GPT-4o-mini equivalent)
    private int    $max_chars = 4000;           // ~1 000 tokens — safe limit for free tier

    // ── Core HTTP call via cURL ───────────────────────────────────────────
    private function call(string $system, string $user): array {
        if (!function_exists('curl_init')) {
            return ['error' => 'cURL is not available on this server.'];
        }

        $body = json_encode([
            'model'       => $this->model,
            'messages'    => [
                ['role' => 'system', 'content' => $system],
                ['role' => 'user',   'content' => $user],
            ],
            'temperature' => 0.4,
            'max_tokens'  => 3000,
            'seed'        => rand(1, 9999),
        ], JSON_UNESCAPED_UNICODE);

        $ch = curl_init($this->endpoint);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_TIMEOUT        => 60,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($body),
            ],
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 3,
        ]);

        $raw      = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        curl_close($ch);

        if ($raw === false || $curlErr) {
            return ['error' => 'Connection to AI service failed: ' . $curlErr];
        }

        $data = json_decode($raw, true);
        if (!is_array($data)) {
            return ['error' => 'Invalid response from AI service (not JSON).'];
        }

        if (isset($data['error'])) {
            $msg = is_array($data['error']) ? ($data['error']['message'] ?? 'AI error') : $data['error'];
            return ['error' => $msg, 'http' => $httpCode];
        }

        $text = $data['choices'][0]['message']['content'] ?? '';
        if (!$text) {
            return ['error' => 'Empty response from AI service.', 'http' => $httpCode];
        }

        return ['text' => trim($text)];
    }

    // ── Tolerant JSON parser — handles markdown fences & trailing commas ──
    private function parseJson(string $raw): ?array {
        // Strip <think> tags (some models add these)
        $s = preg_replace('/<think>.*?<\/think>/si', '', $raw);
        // Strip markdown code fences
        $s = preg_replace('/^```(?:json)?\s*/im', '', $s);
        $s = preg_replace('/\s*```\s*$/im',        '', $s);
        $s = trim($s);

        // Direct parse
        $try = json_decode($s, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($try)) return $try;

        // Extract JSON array
        if (preg_match('/\[[\s\S]*\]/s', $s, $m)) {
            $try = json_decode($m[0], true);
            if (json_last_error() === JSON_ERROR_NONE) return $try;
            // Fix trailing commas
            $fixed = preg_replace('/,\s*([}\]])/', '$1', $m[0]);
            $try   = json_decode($fixed, true);
            if (json_last_error() === JSON_ERROR_NONE) return $try;
        }

        // Extract JSON object
        if (preg_match('/\{[\s\S]*\}/s', $s, $m)) {
            $try = json_decode($m[0], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($try)) return $try;
            $fixed = preg_replace('/,\s*([}\]])/', '$1', $m[0]);
            $try   = json_decode($fixed, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($try)) return $try;
        }

        return null;
    }

    // ── Normalise quiz items to a consistent shape ────────────────────────
    private function normaliseQuiz(array $items, string $quizType): array {
        $out = [];
        foreach ($items as $item) {
            if (!is_array($item)) continue;
            $q    = (string)($item['question'] ?? $item['q'] ?? '');
            $ans  = (string)($item['answer']   ?? $item['correct_answer'] ?? $item['a'] ?? '');
            $expl = (string)($item['explanation'] ?? '');
            $type = (string)($item['type'] ?? $quizType);
            $opts = array_values(array_map('strval', $item['options'] ?? $item['choices'] ?? []));

            // Resolve letter index answer (A/B/C/D) → option text
            if ($opts && strlen(trim($ans)) === 1 && ctype_alpha(trim($ans))) {
                $idx = ord(strtoupper(trim($ans))) - ord('A');
                if (isset($opts[$idx])) $ans = $opts[$idx];
            }

            if ($q) $out[] = [
                'question'    => $q,
                'answer'      => $ans,
                'explanation' => $expl,
                'type'        => $type,
                'options'     => $opts,
                // Legacy aliases kept for JS compatibility
                'q'   => $q,
                'ans' => $ans,
                'expl'=> $expl,
            ];
        }
        return $out;
    }

    // ── Prompts ───────────────────────────────────────────────────────────

    private function flashcardPrompt(string $text, int $count): array {
        $sys = 'You are a study assistant. Return ONLY valid JSON arrays. No markdown, no explanation, no extra text.';
        $usr = "Create exactly {$count} flashcards from the study material below.\n"
             . "Return ONLY a JSON array. Start with [ end with ].\n"
             . "Each item: {\"front\":\"question or term\",\"back\":\"concise answer\"}\n\n"
             . "STUDY MATERIAL:\n" . mb_substr($text, 0, $this->max_chars);
        return [$sys, $usr];
    }

    private function quizPrompt(string $text, string $type, int $count): array {
        $fmt = match($type) {
            'truefalse'      => '{"question":"...","type":"truefalse","options":["True","False"],"answer":"True","explanation":"..."}',
            'identification' => '{"question":"...","type":"identification","options":[],"answer":"short answer","explanation":"..."}',
            'mixed'          => 'mix of mcq/truefalse/identification — set "type" per item accordingly',
            default          => '{"question":"...","type":"mcq","options":["Option A","Option B","Option C","Option D"],"answer":"exact matching option text","explanation":"..."}',
        };
        $sys = 'You are a quiz generator. Return ONLY valid JSON arrays. No markdown, no explanation, no extra text.';
        $usr = "Create exactly {$count} quiz questions from the study material below.\n"
             . "Format each item as: {$fmt}\n"
             . "Return ONLY a JSON array. Start with [ end with ].\n\n"
             . "STUDY MATERIAL:\n" . mb_substr($text, 0, $this->max_chars);
        return [$sys, $usr];
    }

    private function reviewerPrompt(string $text): array {
        $sys = 'You are a study assistant. Return ONLY valid JSON objects. No markdown, no extra text.';
        $usr = "Create a comprehensive study reviewer from the text below.\n"
             . "Return ONLY a JSON object with these keys:\n"
             . "  \"title\": short title,\n"
             . "  \"summary\": 2-3 sentence overview,\n"
             . "  \"key_points\": array of important point strings,\n"
             . "  \"key_terms\": array of {\"term\":\"...\",\"definition\":\"...\"} objects,\n"
             . "  \"study_tips\": array of 3-5 study tip strings.\n\n"
             . "TEXT:\n" . mb_substr($text, 0, $this->max_chars);
        return [$sys, $usr];
    }

    // ── Public API ────────────────────────────────────────────────────────

    public function generateFlashcards(string $text, int $count = 10): array {
        [$sys, $usr] = $this->flashcardPrompt($text, $count);
        $res = $this->call($sys, $usr);
        if (isset($res['error'])) return ['success' => false, 'error' => $res['error'], 'items' => []];

        $items = array_values(array_filter(
            $this->parseJson($res['text']) ?? [],
            fn($i) => is_array($i) && !empty($i['front']) && !empty($i['back'])
        ));

        if (!$items) return [
            'success' => false,
            'error'   => 'Could not parse flashcards from AI response.',
            'items'   => [],
            'raw'     => $res['text'],
        ];
        return ['success' => true, 'items' => $items];
    }

    public function generateQuiz(string $text, string $quizType = 'mcq', int $count = 10): array {
        [$sys, $usr] = $this->quizPrompt($text, $quizType, $count);
        $res = $this->call($sys, $usr);
        if (isset($res['error'])) return ['success' => false, 'error' => $res['error'], 'items' => []];

        $items = $this->normaliseQuiz($this->parseJson($res['text']) ?? [], $quizType);
        if (!$items) return [
            'success' => false,
            'error'   => 'Could not parse quiz from AI response.',
            'items'   => [],
            'raw'     => $res['text'],
        ];
        return ['success' => true, 'items' => $items];
    }

    public function generateFromText(string $text, string $genType = 'flashcard', string $quizType = 'mcq', int $count = 10): array {
        return $genType === 'quiz'
            ? $this->generateQuiz($text, $quizType, $count)
            : $this->generateFlashcards($text, $count);
    }

    public function generateReviewer(string $text): array {
        [$sys, $usr] = $this->reviewerPrompt($text);
        $res = $this->call($sys, $usr);
        if (isset($res['error'])) return ['success' => false, 'error' => $res['error'], 'items' => []];

        $parsed = $this->parseJson($res['text']) ?? [];
        if (!empty($parsed['title'])) {
            return ['success' => true, 'items' => [$parsed]];
        }
        return [
            'success' => false,
            'error'   => 'Could not parse reviewer from AI response.',
            'items'   => [],
            'raw'     => $res['text'],
        ];
    }

    // ── Factory ───────────────────────────────────────────────────────────
    public static function make(): self {
        return new self();
    }
}
