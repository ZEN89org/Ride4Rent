<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CheckVoiceConfiguration extends Command
{
    protected $signature = 'voice:check';
    protected $description = 'Check voice calling configuration without printing credentials';

    public function handle(): int
    {
        $valid = true;
        foreach (['url', 'api_key', 'api_secret'] as $key) {
            $present = is_string(config('services.livekit.'.$key)) && trim(config('services.livekit.'.$key)) !== '';
            $this->line('LIVEKIT_'.strtoupper($key).': '.($present ? 'set' : 'MISSING'));
            $valid = $valid && $present;
        }
        if ($valid && !str_starts_with((string) config('services.livekit.url'), 'wss://')) {
            $this->error('LIVEKIT_URL must use wss:// for deployed calling.');
            return self::FAILURE;
        }
        $this->line('This checks configuration presence only; it does not verify the server connection or key pair.');
        return $valid ? self::SUCCESS : self::FAILURE;
    }
}
