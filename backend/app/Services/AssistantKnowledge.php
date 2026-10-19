<?php

namespace App\Services;

use App\Models\PlatformSetting;

class AssistantKnowledge
{
    public const VERSION = '2026-10-20';

    public function topics(): array
    {
        $fee = RentalPolicy::RESERVATION_PERCENT;
        $balance = 100 - $fee;
        $hours = RentalPolicy::NO_SHOW_HOURS;
        $advance = (int) PlatformSetting::get('max_advance_days', '30');

        return [
            'payments' => [
                'match' => '/\b(reservation|fee|payment|pay|gcash|deposit|balance|bayad|babayaran|porsyento|percent|magkano)\b/i',
                'en' => "For new bookings, the reservation fee is {$fee}% of the selected rental total, credited toward that total. Pay it through the operator’s GCash details and submit the reference/receipt for verification. Pay the remaining {$balance}% in person before handover. Ride4Rent records manual payment confirmation; the assistant cannot collect money or verify a transfer. Existing bookings retain their recorded amounts. Extensions are paid separately in full.",
                'fil' => "Sa bagong booking, {$fee}% ng kabuuang rental ang reservation fee at ibinabawas ito sa total. Gamitin ang GCash details ng operator at isumite ang reference/resibo para ma-check. Bayaran ang natitirang {$balance}% nang personal bago ang handover. Manual ang payment confirmation; hindi ako tumatanggap ng pera o nagve-verify ng transfer. Sundin ang naka-record na halaga sa existing booking. Buo at hiwalay ang bayad sa extension.",
            ],
            'license' => [
                'match' => '/\b(licen[cs]e|lisensya|lisensiya|id|identification|requirements?|documents?|approved id|upload)\b/i',
                'en' => 'Open Profile → Driver’s License → Update License, select new front and back photos, then save. Renters can update even an approved license. New photos await operator review; prior approval is not required to submit a booking. The operator checks the latest photos when approving the booking. If rejected, upload replacements; the operator can use Reject License & Request New Photos. Check the selected vehicle for its age and driving-experience requirements. I cannot approve documents or access your private license photos.',
                'fil' => 'Buksan ang Profile → Driver’s License → Update License, pumili ng bagong front at back photos, at i-save. Puwedeng palitan kahit approved na. Operator ang magre-review ng bagong photos; hindi kailangan ng prior approval para magsumite ng booking. Kapag rejected, mag-upload ng bagong photos. Puwedeng gamitin ng operator ang Reject License & Request New Photos. Tingnan ang age at driving-experience requirements ng napiling sasakyan. Hindi ako makakapag-approve o makakakita ng private license photos mo.',
            ],
            'extensions' => [
                'match' => '/\b(extend|extension|extensions|palawig|dagdag.*araw)\b/i',
                'en' => 'Request an extension from an ongoing trip in Bookings. The operator reviews it. Pay 100% of the extension amount through GCash and submit the payment reference/receipt. There is no second reservation fee. The return date changes after operator payment confirmation. Settle outstanding extension charges and applicable surcharges before completion.',
                'fil' => 'Humiling ng extension sa ongoing trip sa Bookings. Ire-review ito ng operator. Bayaran nang 100% ang extension sa GCash at isumite ang reference/resibo; walang panibagong reservation fee. Magbabago ang return date pagkatapos i-confirm ng operator ang bayad. Bayaran ang outstanding extension at applicable surcharges bago makumpleto ang trip.',
            ],
            'no_show' => [
                'match' => '/no[ -]?show|miss.*pick|fail.*pick|didn.t.*pick|hindi.*(kuha|sundo)|di.*makapunta/i',
                'en' => "An approved booking with no handover closes as a no-show {$hours} hours after scheduled pickup. The reservation fee is retained and the vehicle inventory is released. Contact support to request admin dispute review. I cannot cancel a booking, issue a refund or decide a dispute.",
                'fil' => "Kapag approved ang booking at walang handover hanggang {$hours} oras matapos ang scheduled pickup, magsasara ito bilang no-show. Retained ang reservation fee at magiging available ulit ang unit. Makipag-ugnayan sa support para humiling ng admin dispute review. Hindi ako makakapag-cancel, refund o magdesisyon sa dispute.",
            ],
            'booking' => [
                'match' => '/\b(book|booking|reserve|rental steps|mag-book|proseso)\b/i',
                'en' => "Upload both sides of your license, choose an available vehicle and dates/times, and submit a booking. Pay the {$fee}% reservation fee and submit payment details. The operator reviews payment and license photos before approving. Meet at the pickup location, complete inspection and pay the remaining {$balance}% before handover. Current advance-booking limit: {$advance} days. The assistant gives guidance only; use the app to perform booking actions.",
                'fil' => "I-upload ang dalawang side ng license, pumili ng available na sasakyan at petsa/oras, at magsumite ng booking. Bayaran ang {$fee}% reservation at isumite ang payment details. Iche-check ng operator ang bayad at license bago mag-approve. Sa pickup, kumpletuhin ang inspection at bayaran ang natitirang {$balance}% bago handover. Hanggang {$advance} araw ang kasalukuyang advance-booking limit. Gamitin ang app para gawin ang booking; gabay lang ang assistant.",
            ],
            'maps' => [
                'match' => '/\b(map|route|pickup|location|gps|tracking|mindoro|lokasyon|saan)\b/i',
                'en' => 'Pickup directions run inside the app from the renter’s current/set location to the operator’s pickup place. Pickup selections are restricted to Oriental Mindoro. During an ongoing trip, tracking shows reported vehicle telemetry, with live/last-known indicators; a garage marker is not proof of current vehicle location. GPS permission and an available device signal are needed.',
                'fil' => 'Nasa app ang pickup directions mula sa current/set location ng renter papunta sa pickup place ng operator. Sa Oriental Mindoro lang ang pickup selections. Sa ongoing trip, reported vehicle GPS ang ginagamit kasama ang live/last-known indicator; hindi live location ang garage marker. Kailangan ang GPS permission at signal.',
            ],
            'chat' => [
                'match' => '/\b(chat|message|messages|call|audio|tawag|mensahe)\b/i',
                'en' => 'Use Message Host to chat and Call in App for voice calls. Conversations are ordered by their latest sent or received message, not unread status. Voice calls need microphone permission, a compatible native app and a configured voice server. The assistant cannot place a call or read your private messages.',
                'fil' => 'Gamitin ang Message Host para sa chat at Call in App para tumawag. Pinakabagong sent o received message ang basehan ng chat order, hindi unread status. Kailangan ng microphone permission, compatible native app at configured voice server. Hindi ako makakatawag o makakabasa ng private messages mo.',
            ],
            'refunds' => [
                'match' => '/\b(refund|cancel|cancellation|dispute|reimburse|balik.*bayad)\b/i',
                'en' => 'Use the booking’s available cancel action and check its displayed refund status. Paid reservations declined or cancelled through the refund flow become pending operator refunds; payment is not automatically reversed by a gateway. No-show reservation fees are retained, with admin dispute review available through support. I cannot promise a refund amount or completion time without the booking record.',
                'fil' => 'Gamitin ang available na cancel action ng booking at tingnan ang refund status nito. Sa refund flow, pending operator refund ang paid reservations na declined o cancelled; hindi automatic na ibinabalik ng gateway ang pera. Retained ang no-show reservation fee pero puwedeng humiling ng admin dispute review sa support. Hindi ako makakapangako ng halaga o petsa ng refund nang walang booking record.',
            ],
            'updates' => [
                'match' => '/what.*(changed|new|updated)|latest.*(changes|features|updates)|ano.*(bago|update)/i',
                'en' => "Current rules include {$fee}% reservation and {$balance}% before handover, full-payment ongoing-trip extensions, operator review of replaceable license photos, {$hours}-hour no-shows, Oriental Mindoro pickup maps, grouped notifications and latest-message chat ordering. This knowledge describes this backend version; another installed app or deployment may be older.",
                'fil' => "Kasama sa kasalukuyang rules ang {$fee}% reservation at {$balance}% bago handover, full-payment extensions sa ongoing trips, operator review ng napapalitang license photos, {$hours}-hour no-show, Oriental Mindoro pickup map, grouped notifications at latest-message chat order. Para ito sa backend version na ito; maaaring mas luma ang ibang installed app o deployment.",
            ],
            'notifications' => [
                'match' => '/\b(notification|notifications|reminder|reminders|abiso|paalala)\b/i',
                'en' => 'Notifications with the same title are grouped and show a count when there is more than one. Open a group to access its individual items. You can filter unread items and archive notifications. Pickup, trip-start, booking-approval, upcoming-trip and interest reminders have different icons. Delivery depends on notification permissions and device/server configuration; I cannot guarantee a reminder was delivered.',
                'fil' => 'Magkakasama ang notifications na pareho ang title at may count kung higit sa isa. Buksan ang group para makita ang bawat item. May unread filter at archive. Magkakaiba ang icons ng pickup, trip start, booking approval at reminders. Nakadepende ang delivery sa permission at device/server setup; hindi ko magagarantiya na dumating ang paalala.',
            ],
        ];
    }

    public function answer(string $question): ?string
    {
        $language = preg_match('/\b(paano|ano|magkano|ako|ko|ba|po|pwede|puwede|kailangan|bayad|bakit|saan|hindi|ng|ang|lisensya)\b/i', $question) ? 'fil' : 'en';
        $answers = [];
        foreach ($this->topics() as $topic) {
            if (preg_match($topic['match'], $question)) $answers[] = $topic[$language];
        }
        return $answers ? implode("\n\n", array_slice($answers, 0, 3)) : null;
    }

    public function prompt(): string
    {
        return implode("\n\n", array_map(fn ($topic) => $topic['en'], $this->topics()));
    }
}
