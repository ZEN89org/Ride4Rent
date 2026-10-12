<?php

namespace Tests\Feature;

use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConversationActionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_archive_and_restore_a_conversation_without_deleting_messages(): void
    {
        [$renter, $operator] = $this->createConversation();
        $conversationUrl = "/api/v1/messages/conversations/{$operator->id}";

        $this->actingAs($renter, 'sanctum')
            ->postJson("{$conversationUrl}/archive")
            ->assertOk();

        $this->actingAs($renter, 'sanctum')
            ->getJson('/api/v1/messages/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.archived', true);

        $this->actingAs($operator, 'sanctum')
            ->getJson('/api/v1/messages/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.archived', false);

        $this->actingAs($renter, 'sanctum');
        $this->deleteJson("{$conversationUrl}/archive")
            ->assertOk();

        $this->getJson('/api/v1/messages/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.archived', false);

        $this->assertDatabaseHas('messages', [
            'sender_id' => $renter->id,
            'receiver_id' => $operator->id,
            'message' => 'Hello',
        ]);
    }

    public function test_user_can_remove_conversation_from_their_list_while_preserving_history(): void
    {
        [$renter, $operator] = $this->createConversation();

        $this->actingAs($renter, 'sanctum')
            ->deleteJson("/api/v1/messages/conversations/{$operator->id}")
            ->assertOk();

        $this->getJson('/api/v1/messages/conversations')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->actingAs($operator, 'sanctum')
            ->getJson('/api/v1/messages/conversations')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->assertDatabaseHas('messages', [
            'sender_id' => $renter->id,
            'receiver_id' => $operator->id,
            'message' => 'Hello',
        ]);
    }

    public function test_a_new_message_restores_a_removed_conversation(): void
    {
        [$renter, $operator] = $this->createConversation();

        $this->actingAs($renter, 'sanctum')
            ->deleteJson("/api/v1/messages/conversations/{$operator->id}")
            ->assertOk();

        $this->actingAs($operator, 'sanctum')
            ->postJson('/api/v1/messages/send', [
                'receiver_id' => $renter->id,
                'message' => 'Following up',
            ])
            ->assertCreated();

        $this->actingAs($renter, 'sanctum')
            ->getJson('/api/v1/messages/conversations')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    /**
     * @return array{User, User}
     */
    private function createConversation(): array
    {
        $renter = User::create([
            'first_name' => 'Renter',
            'last_name' => 'One',
            'date_of_birth' => '1990-01-01',
            'sex' => 'Female',
            'email' => 'renter@example.com',
            'password' => 'password',
            'role' => 'customer',
        ]);
        $operator = User::create([
            'first_name' => 'Operator',
            'last_name' => 'One',
            'date_of_birth' => '1985-01-01',
            'sex' => 'Male',
            'email' => 'operator@example.com',
            'password' => 'password',
            'role' => 'operator',
        ]);

        Message::create([
            'sender_id' => $renter->id,
            'receiver_id' => $operator->id,
            'message' => 'Hello',
        ]);

        return [$renter, $operator];
    }
}
