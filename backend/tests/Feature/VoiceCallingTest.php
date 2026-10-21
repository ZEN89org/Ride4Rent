<?php

namespace Tests\Feature;

use App\Models\Call;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class VoiceCallingTest extends TestCase
{
    use RefreshDatabase;

    private function participant(string $role): User
    {
        return User::create(['first_name' => 'Test', 'last_name' => $role, 'email' => $role.'@calls.test',
            'password' => 'test-password', 'date_of_birth' => '1990-01-01', 'sex' => 'Male', 'role' => $role, 'account_status' => 'active']);
    }

    public function test_unconfigured_call_fails_before_creating_a_ringing_call(): void
    {
        config(['services.livekit' => ['url' => '', 'api_key' => '', 'api_secret' => '']]);
        $renter = $this->participant('customer'); $operator = $this->participant('operator');
        $this->actingAs($renter, 'sanctum')->postJson('/api/v1/calls/initiate', ['receiver_id' => $operator->id])->assertStatus(503);
        $this->assertDatabaseCount('calls', 0);
        config(['services.livekit' => ['url' => 'https://dashboard.example', 'api_key' => 'test-key', 'api_secret' => 'test-secret']]);
        $this->postJson('/api/v1/calls/initiate', ['receiver_id' => $operator->id])->assertStatus(503);
    }

    public function test_call_tokens_are_scoped_to_the_room_and_participant_and_duration_is_correct(): void
    {
        config(['services.livekit' => ['url' => 'wss://voice.example.test', 'api_key' => 'test-key', 'api_secret' => 'test-secret']]);
        $renter = $this->participant('customer'); $operator = $this->participant('operator');
        $call = $this->actingAs($renter, 'sanctum')->postJson('/api/v1/calls/initiate', ['receiver_id' => $operator->id])->assertOk()->json('data');
        [$header, $payload, $signature] = explode('.', $call['livekit_token']);
        $decoded = json_decode(base64_decode(strtr($payload, '-_', '+/')), true);
        $this->assertSame((string) $renter->id, $decoded['sub']);
        $this->assertSame($call['channel_name'], $decoded['video']['room']);
        $this->assertTrue($decoded['video']['canPublish']);
        $this->assertSame(rtrim(strtr(base64_encode(hash_hmac('sha256', $header.'.'.$payload, 'test-secret', true)), '+/', '-_'), '='), $signature);
        $this->postJson('/api/v1/calls/'.$call['id'].'/answer')->assertForbidden();
        $answered = $this->actingAs($operator, 'sanctum')->postJson('/api/v1/calls/'.$call['id'].'/answer')->assertOk()->json('data');
        $receiverToken = json_decode(base64_decode(strtr(explode('.', $answered['livekit_token'])[1], '-_', '+/')), true);
        $this->assertSame((string) $operator->id, $receiverToken['sub']);
        $this->assertIsInt(Call::first()->caller_id);
        $this->travel(65)->seconds();
        $this->postJson('/api/v1/calls/'.$call['id'].'/end')->assertOk()->assertJsonPath('data.duration', 65);
        $this->postJson('/api/v1/calls/'.$call['id'].'/end')->assertOk();
        $this->assertSame(1, Message::count());
    }

    public function test_call_doctor_verifies_credentials_without_printing_sensitive_values(): void
    {
        config(['services.livekit' => ['url' => 'wss://voice.example.test', 'api_key' => 'private-key-value', 'api_secret' => 'private-secret-value']]);
        Http::fake(['voice.example.test/*' => Http::sequence()->push(['rooms' => []], 200)->push([], 401)]);
        $this->assertSame(0, Artisan::call('calls:doctor', ['--connect' => true]));
        $output = Artisan::output();
        $this->assertStringContainsString('API key and secret accepted', $output);
        foreach (['private-key-value', 'private-secret-value', 'Bearer'] as $hidden) $this->assertStringNotContainsString($hidden, $output);
        Http::assertSent(fn ($request) => $request->url() === 'https://voice.example.test/twirp/livekit.RoomService/ListRooms' && $request->hasHeader('Authorization'));
        $this->assertSame(1, Artisan::call('calls:doctor', ['--connect' => true]));
        $this->assertStringContainsString('HTTP 401', Artisan::output());
    }
}
