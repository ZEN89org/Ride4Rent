<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class CheckVoiceCalling extends Command
{
    protected $signature = 'calls:doctor {--connect : Verify credentials with the LiveKit read-only ListRooms API}';
    protected $description = 'Check voice-call configuration without printing keys, secrets, tokens or room data';

    public function handle(): int
    {
        $config = config('services.livekit');
        $missing = false;
        foreach (['url' => 'LIVEKIT_URL', 'api_key' => 'LIVEKIT_API_KEY', 'api_secret' => 'LIVEKIT_API_SECRET'] as $key => $label) {
            $present = is_string($config[$key] ?? null) && trim($config[$key]) !== '';
            $this->line($label.': '.($present ? 'set (value hidden)' : 'MISSING'));
            $missing = $missing || !$present;
        }
        $this->line('Laravel config cache: '.(app()->configurationIsCached() ? 'enabled; rebuild after changing variables' : 'not cached'));
        if ($missing) return self::FAILURE;
        $url = trim($config['url']);
        $parts = parse_url($url);
        if (!$parts || !in_array($parts['scheme'] ?? '', ['wss', 'ws']) || empty($parts['host']) || isset($parts['user']) || isset($parts['pass']) || isset($parts['query'])) {
            $this->error('LIVEKIT_URL must be your LiveKit project WebSocket URL, for example wss://project.livekit.cloud.');
            return self::FAILURE;
        }
        $this->info('WebSocket URL syntax: valid (URL hidden)');
        if (!$this->option('connect')) {
            $this->line('Run calls:doctor --connect to verify server reachability and credentials.');
            return self::SUCCESS;
        }
        $encode = fn ($data) => rtrim(strtr(base64_encode(json_encode($data)), '+/', '-_'), '=');
        $unsigned = $encode(['alg' => 'HS256', 'typ' => 'JWT']).'.'.$encode([
            'iss' => trim($config['api_key']), 'nbf' => time() - 5, 'exp' => time() + 60, 'video' => ['roomList' => true],
        ]);
        $token = $unsigned.'.'.rtrim(strtr(base64_encode(hash_hmac('sha256', $unsigned, trim($config['api_secret']), true)), '+/', '-_'), '=');
        $httpUrl = preg_replace('/^wss:/', 'https:', preg_replace('/^ws:/', 'http:', rtrim($url, '/')));
        try {
            $response = Http::withToken($token)->acceptJson()->connectTimeout(5)->timeout(12)
                ->withOptions(['allow_redirects' => false])->withBody('{}', 'application/json')->post($httpUrl.'/twirp/livekit.RoomService/ListRooms');
            if ($response->successful()) {
                $this->info('LiveKit API: reachable; API key and secret accepted. No room created or modified.');
                return self::SUCCESS;
            }
            $this->error('LiveKit API check failed: HTTP '.$response->status().'. '.match ($response->status()) {
                401, 403 => 'The key/secret may not belong to this project, may be revoked, or may lack permission. Check that all three variables come from the same project.',
                404 => 'Check the project URL; use the LiveKit service host, not the dashboard or Laravel URL.',
                default => 'Check LiveKit service availability and outbound HTTPS access.',
            });
        } catch (\Throwable) {
            $this->error('Could not reach the LiveKit API. Check DNS, TLS, URL and outbound network access. Details withheld to protect credentials.');
        }
        return self::FAILURE;
    }
}
