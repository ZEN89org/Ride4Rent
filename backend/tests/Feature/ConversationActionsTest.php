<?php

namespace Tests\Feature;

use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConversationActionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_conversation_pages_and_archive_search(): void
    {
        [$renter, $operator] = $this->createConversation();
        for ($i = 0; $i < 24; $i++) {
            $contact = $operator->replicate(); $contact->email = "operator{$i}@example.com"; $contact->first_name = "Host{$i}"; $contact->save();
            Message::create(['sender_id' => $contact->id, 'receiver_id' => $renter->id, 'message' => "Message {$i}"]);
        }
        $url = '/api/v1/messages/conversations?limit=10&page=';
        $first = $this->actingAs($renter, 'sanctum')->getJson($url.'1')->assertOk()->assertJsonCount(10, 'data')->assertJsonPath('has_more', true);
        $second = $this->getJson($url.'2')->assertOk()->assertJsonCount(10, 'data');
        $third = $this->getJson($url.'3')->assertOk()->assertJsonCount(5, 'data')->assertJsonPath('has_more', false);
        $ids = array_merge(array_column($first->json('data'), 'user_id'), array_column($second->json('data'), 'user_id'), array_column($third->json('data'), 'user_id'));
        $this->assertCount(25, array_unique($ids));
        $this->postJson("/api/v1/messages/conversations/{$operator->id}/archive")->assertOk();
        $this->getJson('/api/v1/messages/conversations?limit=20&page=1&folder=archived')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.user_id', $operator->id);
        $this->getJson('/api/v1/messages/conversations?limit=20&page=1&search=Host23')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('has_more', false);
    }

    public function test_message_history_cutoff_applies_to_both_participants(): void
    {
        [$renter, $operator] = $this->createConversation();
        $url = "/api/v1/messages/thread/{$operator->id}";
        $this->actingAs($renter, 'sanctum')->getJson($url.'?limit=40')->assertOk()->assertJsonPath('has_more', false);
        for ($i = 0; $i < 40; $i++) Message::create(['sender_id' => $i % 2 ? $renter->id : $operator->id, 'receiver_id' => $i % 2 ? $operator->id : $renter->id, 'message' => "History {$i}"]);
        $latest = $this->getJson($url.'?limit=40')->assertOk()->assertJsonCount(40, 'data')->assertJsonPath('has_more', true);
        $oldestId = $latest->json('data.0.id');
        $earlier = $this->getJson($url.'?limit=40&before_id='.$oldestId)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('has_more', false);
        $this->assertLessThan((int) $oldestId, (int) $earlier->json('data.0.id'));
    }

    public function test_chat_message_time_is_the_same_philippine_time_for_both_participants(): void
    {
        $this->travelTo(\Carbon\Carbon::parse('2026-10-20 20:35:00', 'UTC'));
        [$renter, $operator] = $this->createConversation();
        $sent = $this->actingAs($renter, 'sanctum')->postJson('/api/v1/messages/send', [
            'receiver_id' => $operator->id, 'message' => 'PAYMENT RECEIPT\nReference: 1234567890123',
        ])->assertCreated()->assertJsonPath('data.time', '04:35 AM');
        $messageId = $sent->json('data.id');
        $renterThread = $this->actingAs($renter, 'sanctum')->getJson("/api/v1/messages/thread/{$operator->id}")->assertOk();
        $operatorThread = $this->actingAs($operator, 'sanctum')->getJson("/api/v1/messages/thread/{$renter->id}")->assertOk();
        $renterMessage = collect($renterThread->json('data'))->firstWhere('id', $messageId);
        $operatorMessage = collect($operatorThread->json('data'))->firstWhere('id', $messageId);
        $this->assertSame('04:35 AM', $renterMessage['time']);
        $this->assertSame($renterMessage['time'], $operatorMessage['time']);
        $this->assertSame($renterMessage['created_at'], $operatorMessage['created_at']);
        $this->travelBack();
    }

    public function test_conversations_follow_latest_sent_or_received_message_not_unread_status(): void
    {
        [$renter, $operator] = $this->createConversation();
        $other = $operator->replicate();
        $other->email = 'second-operator@example.com';
        $other->save();
        Message::create(['sender_id' => $other->id, 'receiver_id' => $renter->id, 'message' => 'Older unread']);
        $this->travel(1)->minutes();
        $this->actingAs($renter, 'sanctum')->postJson('/api/v1/messages/send', [
            'receiver_id' => $operator->id, 'message' => 'Latest sent',
        ])->assertCreated();
        $this->getJson('/api/v1/messages/conversations')->assertOk()
            ->assertJsonPath('data.0.user_id', $operator->id)->assertJsonPath('data.0.last_message', 'Latest sent');
        // Same timestamp: the higher message ID is the newer message.
        $this->actingAs($other, 'sanctum')->postJson('/api/v1/messages/send', [
            'receiver_id' => $renter->id, 'message' => 'Latest received',
        ])->assertCreated();
        $this->actingAs($renter, 'sanctum')->getJson('/api/v1/messages/conversations')->assertOk()
            ->assertJsonPath('data.0.user_id', $other->id)->assertJsonPath('data.0.last_message', 'Latest received');
    }

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
