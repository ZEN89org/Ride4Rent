<?php

namespace App\Services;

use App\Models\PlatformSetting;

class AssistantKnowledge
{
    public const VERSION = '2026-10-21-maintenance-paging';

    public function topics(): array
    {
        $fee = RentalPolicy::RESERVATION_PERCENT;
        $balance = 100 - $fee;
        $hours = RentalPolicy::NO_SHOW_HOURS;
        $advance = (int) PlatformSetting::get('max_advance_days', '30');

        return [
            'maintenance' => [
                'match' => '/\b(maintenance|maintain|service interval|odometer|oil|brakes?|tires?|tyres?|preventive|mileage|pagpapanatili)\b/i',
                'en' => 'Operators can open Maintenance from the dashboard or side menu. Mileage & Service Schedule records the current odometer, last routine-service mileage and manufacturer-based service interval. Recommendations use these readings and service history: setup needed, on schedule, due soon or service due. Due soon means within the smaller of 500 km or 10% of the interval. Record completed work with Log Service Record. Only routine preventive maintenance or oil-and-filter service resets the routine countdown; brake, tire, battery and general-repair entries keep their own history without resetting it. Unknown history needs an inspection/baseline, not a claim of good condition. These are rule-based reminders, not mechanical diagnoses or GPS mileage estimates. Returned vehicles are put Under Maintenance for inspection before the operator makes them Available again. Maintenance listings remain visible to renters but cannot be booked. Change vehicle availability to Maintenance when it should not be rented. I cannot inspect a vehicle or read a private fleet record in this chat.',
                'fil' => 'Buksan ng operator ang Maintenance sa dashboard o side menu. Sa Mileage & Service Schedule, ilagay ang current odometer, mileage ng huling routine service at interval ayon sa manufacturer. Batay sa readings at service history ang setup needed, on schedule, due soon at service due. Due soon kapag nasa loob na ng mas maliit sa 500 km o 10% ng interval. I-record ang natapos na trabaho sa Log Service Record. Routine preventive maintenance o oil-and-filter service lang ang nagre-reset ng countdown; hindi ang brake, tire, battery o general repair. Kung hindi alam ang history, kailangan ng inspection at baseline. Rule-based reminders ito, hindi mechanical diagnosis o GPS mileage estimate. Pagkatapos ng return inspection, Under Maintenance ang sasakyan hanggang gawin ulit ng operator na Available. Nakikita pa rin ng renter ang maintenance listing pero hindi ito puwedeng i-book. Itakda ang availability sa Maintenance kung hindi dapat iparenta.',
            ],
            'demand_pricing' => [
                'match' => '/demand|dynamic pric|pricing algorithm|price change|presyo.*(taas|baba)/i',
                'en' => 'Demand-based pricing uses area booking occupancy, the vehicle’s recent booking count and Friday–Sunday demand. When dynamic pricing is enabled for a vehicle, its calculated rate is shown; otherwise its listed daily rate applies. Check the rate and full rental total shown before submitting a booking. New reservations pay 50% of that rental total, with the other 50% before handover. A price recommendation is not a guarantee of future demand or earnings, and existing bookings keep their recorded charges.',
                'fil' => 'Gumagamit ang demand-based pricing ng booking occupancy sa lugar, recent bookings ng sasakyan at Friday–Sunday demand. Kapag enabled ang dynamic pricing, calculated rate ang ginagamit; kung hindi, listed daily rate. Tingnan ang presyo at kabuuang rental bago magsumite. Sa bagong reservation, 50% muna at ang natitirang 50% bago handover. Hindi garantisado ang future demand o kita at hindi binabago ang naka-record na charges ng existing bookings.',
            ],
            'receipts' => [
                'match' => '/receipt|resibo|payment confirmed|return settlement|transaction record/i',
                'en' => 'Payment submissions and confirmations create protected receipts automatically in the renter–operator conversation, including reservation, handover, extension, return charges and refunds. A submitted receipt is awaiting verification; it is not proof the operator confirmed the transfer. Face-to-face payments show the amount, transaction status and date without an online reference number or IN PERSON label. Dates use Philippine local time. The pinned request clears when the payment receipt is submitted. Refunds recorded by the operator may still need the renter’s confirmation of actual receipt.',
                'fil' => 'Automatic ang protected receipts sa renter–operator chat para sa payment submission at confirmation: reservation, handover, extension, return charges at refunds. Ang submitted ay naghihintay pa ng verification. Sa face-to-face payment, halaga, status at petsa lang ang kailangan; walang online reference o IN PERSON label. Philippine local time ang petsa. Nawawala ang pinned payment request kapag naisumite ang resibo. Maaaring kailangan pa ng renter confirmation kapag na-record na ng operator ang refund.',
            ],
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
                'en' => 'Request an extension from an ongoing trip in Bookings. The operator must approve the request before payment becomes available. A pending request is not approved or paid. Pay 100% of the extension amount through GCash and submit the payment reference/receipt. There is no second reservation fee. Submitting a reference leaves payment pending verification; the operator may request a correction. The return date and rental totals change only after operator payment confirmation. Automatic submission and confirmation receipts appear in chat. Settle outstanding extension charges and applicable surcharges before completion.',
                'fil' => 'Humiling ng extension sa ongoing trip sa Bookings. Kailangan munang i-approve ng operator bago magbayad; hindi pa approved o paid ang pending request. Bayaran nang 100% ang extension sa GCash at isumite ang reference/resibo; walang panibagong reservation fee. Pending verification pa ang submitted reference; puwedeng humingi ng correction ang operator. Magbabago lang ang return date at totals kapag confirmed na ang bayad. Automatic ang submission at confirmation receipts sa chat. Bayaran ang outstanding extension at applicable surcharges bago makumpleto ang trip.',
            ],
            'early_return' => [
                'match' => '/\b(early return|return early|unused days|maagang balik|maagang ibalik)\b/i',
                'en' => 'During an active trip, use Request early return in Bookings to propose a date and time. The operator approves or declines the arrangement. The trip and GPS remain active until actual handover, return inspection and settlement. The original rental total remains unchanged; unused days have no automatic refund. Discuss any early-return refund face to face with the operator. Record the agreed refund separately after completion, and the renter confirms only after receiving it.',
                'fil' => 'Sa active trip, gamitin ang Request early return sa Bookings at pumili ng petsa at oras. Ire-review ito ng operator. Active pa rin ang trip at GPS hanggang actual handover, inspection at settlement. Hindi nagbabago ang original rental total at walang automatic refund sa hindi nagamit na araw. Hiwalay na ire-record ang anumang napagkasunduang refund pagkatapos ng completion; i-confirm lang kapag natanggap na.',
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
                'en' => 'Pickup directions run inside the app from the renter’s current/set location to the operator’s pickup place. Pickup selections are restricted to Oriental Mindoro. During an ongoing trip, tracking follows the renter’s phone location automatically, with live/last-known indicators and rounded speed. This is not a separate hardware tracker. Reliable reports outside Oriental Mindoro notify the operator; tracking does not physically stop a vehicle at the boundary. Turning off location sharing notifies both participants. Permission, location services, connectivity and supported background execution are needed; stale readings are not live positions.',
                'fil' => 'Nasa app ang pickup directions mula sa current/set location ng renter papunta sa pickup place ng operator. Sa Oriental Mindoro lang ang pickup selections. Sa ongoing trip, renter phone GPS ang sinusundan nang automatic, may live/last-known indicator at rounded speed. Nino-notify ang operator sa reliable report na labas ng Oriental Mindoro; hindi nito pisikal na pinipigil ang sasakyan. Parehong may abiso kapag off ang location sharing. Kailangan ng permission, location services at connectivity; hindi live ang stale reading.',
            ],
            'chat' => [
                'match' => '/\b(chat|message|messages|call|audio|tawag|mensahe)\b/i',
                'en' => 'Use Message Host to chat and Call in App for voice calls. Conversations are ordered by their latest sent or received message, not unread status. Voice calls need microphone permission, a compatible Ride4Rent development/preview/production build, both users online and a configured LiveKit server. Expo Go cannot transmit call audio. The assistant cannot place a call or read your private messages.',
                'fil' => 'Gamitin ang Message Host para sa chat at Call in App para tumawag. Pinakabagong sent o received message ang basehan ng chat order, hindi unread status. Kailangan ng microphone permission, Ride4Rent development/preview/production build, parehong online na user at configured LiveKit server. Hindi gumagana ang call audio sa Expo Go. Hindi ako makakatawag o makakabasa ng private messages mo.',
            ],
            'refunds' => [
                'match' => '/\b(refund|cancel|cancellation|dispute|reimburse|balik.*bayad)\b/i',
                'en' => 'Use the booking’s available cancel action and check its displayed refund status. Paid reservations declined or cancelled through the refund flow become pending operator refunds; payment is not automatically reversed by a gateway. No-show reservation fees are retained, with admin dispute review available through support. I cannot promise a refund amount or completion time without the booking record.',
                'fil' => 'Gamitin ang available na cancel action ng booking at tingnan ang refund status nito. Sa refund flow, pending operator refund ang paid reservations na declined o cancelled; hindi automatic na ibinabalik ng gateway ang pera. Retained ang no-show reservation fee pero puwedeng humiling ng admin dispute review sa support. Hindi ako makakapangako ng halaga o petsa ng refund nang walang booking record.',
            ],
            'updates' => [
                'match' => '/what.*(changed|new|updated)|latest.*(changes|features|updates)|ano.*(bago|update)/i',
                'en' => "Current rules include {$fee}% reservation and {$balance}% before handover, full-payment ongoing-trip extensions, operator review of replaceable license photos, {$hours}-hour no-shows, Oriental Mindoro pickup maps and renter-phone GPS alerts, maintenance recommendations, demand-based pricing, automatic chat receipts, grouped notifications and latest-message chat ordering. This knowledge describes this backend version; another installed app or deployment may be older.",
                'fil' => "Kasama sa kasalukuyang rules ang {$fee}% reservation at {$balance}% bago handover, full-payment extensions sa ongoing trips, operator review ng napapalitang license photos, {$hours}-hour no-show, Oriental Mindoro pickup map at renter-phone GPS alerts, maintenance recommendations, demand-based pricing, automatic chat receipts, grouped notifications at latest-message chat order. Para ito sa backend version na ito; maaaring mas luma ang ibang installed app o deployment.",
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
        $topics = $this->topics();
        $priority = ['updates', 'maintenance', 'demand_pricing', 'receipts', 'early_return', 'extensions', 'no_show', 'refunds', 'license', 'maps', 'chat', 'notifications', 'payments', 'booking'];
        foreach ($priority as $key) {
            $topic = $topics[$key];
            if (preg_match($topic['match'], $question)) $answers[] = $topic[$language];
        }
        return $answers ? implode("\n\n", array_slice($answers, 0, 3)) : null;
    }

    public function prompt(): string
    {
        return implode("\n\n", array_map(fn ($topic) => $topic['en'], $this->topics()));
    }
}
