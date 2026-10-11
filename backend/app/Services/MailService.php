<?php

namespace App\Services;

use App\Mail\PasswordResetOtpMail;
use App\Mail\VerificationOtpMail;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class MailService
{
    /**
     * Send OTP Verification email via HTTPS API (Brevo/Resend) or fallback to standard Mailer.
     */
    public static function sendVerificationOtp(string $toEmail, string $otp): bool
    {
        $subject = "Your Ride4Rent Verification Code: {$otp}";
        $htmlContent = "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;'>
            <div style='text-align: center; margin-bottom: 20px;'>
                <h1 style='color: #208AEF; margin: 0;'>Ride4Rent</h1>
                <p style='color: #666; font-size: 14px;'>Car Rental & Fleet Management</p>
            </div>
            <div style='background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-align: center;'>
                <h2 style='color: #333; margin-top: 0;'>Verify Your Gmail Address</h2>
                <p style='color: #555; font-size: 15px; line-height: 1.5;'>
                    Use the confirmation code below to complete your Ride4Rent registration. This code expires in <strong>10 minutes</strong>.
                </p>
                <div style='margin: 30px 0;'>
                    <span style='display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #111; background-color: #FEC103; padding: 12px 28px; border-radius: 8px;'>
                        {$otp}
                    </span>
                </div>
                <p style='color: #888; font-size: 13px;'>If you did not request this verification code, please ignore this email.</p>
            </div>
            <div style='text-align: center; margin-top: 20px; color: #aaa; font-size: 12px;'>
                &copy; " . date('Y') . " Ride4Rent. All rights reserved.
            </div>
        </div>";

        return self::dispatchEmail($toEmail, $subject, $htmlContent, new VerificationOtpMail($otp));
    }

    /**
     * Send Password Reset OTP email.
     */
    public static function sendPasswordResetOtp(string $toEmail, string $otp): bool
    {
        $subject = "Ride4Rent Password Reset Code: {$otp}";
        $htmlContent = "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;'>
            <div style='text-align: center; margin-bottom: 20px;'>
                <h1 style='color: #208AEF; margin: 0;'>Ride4Rent</h1>
                <p style='color: #666; font-size: 14px;'>Password Reset Request</p>
            </div>
            <div style='background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-align: center;'>
                <h2 style='color: #333; margin-top: 0;'>Reset Your Password</h2>
                <p style='color: #555; font-size: 15px; line-height: 1.5;'>
                    Use the 6-digit code below to reset your Ride4Rent password. This code expires in <strong>10 minutes</strong>.
                </p>
                <div style='margin: 30px 0;'>
                    <span style='display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #111; background-color: #FEC103; padding: 12px 28px; border-radius: 8px;'>
                        {$otp}
                    </span>
                </div>
                <p style='color: #888; font-size: 13px;'>If you did not make this request, you can safely ignore this email.</p>
            </div>
            <div style='text-align: center; margin-top: 20px; color: #aaa; font-size: 12px;'>
                &copy; " . date('Y') . " Ride4Rent. All rights reserved.
            </div>
        </div>";

        return self::dispatchEmail($toEmail, $subject, $htmlContent, new PasswordResetOtpMail($otp));
    }

    /**
     * Universal email dispatcher:
     * 1. If BREVO_API_KEY is configured, sends via Brevo REST API over HTTPS (Port 443).
     * 2. If RESEND_API_KEY is configured, sends via Resend REST API over HTTPS (Port 443).
     * 3. Fallback: Uses standard SMTP mailer.
     */
    private static function dispatchEmail(string $toEmail, string $subject, string $htmlContent, $mailable): bool
    {
        $senderName = env('MAIL_FROM_NAME', 'Ride4Rent');
        $replyToEmail = env('MAIL_FROM_ADDRESS', 'ride4rentph@gmail.com');
        $brevoSenderEmail = env('BREVO_SENDER_EMAIL', 'ride4rentph@gmail.com');

        // 1. Try Brevo HTTPS API (works on cloud hosts with blocked SMTP ports)
        $brevoApiKey = env('BREVO_API_KEY');
        if (!empty($brevoApiKey)) {
            try {
                $response = Http::withHeaders([
                    'api-key' => $brevoApiKey,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])->timeout(6)->post('https://api.brevo.com/v3/smtp/email', [
                    'sender' => [
                        'name' => $senderName,
                        'email' => $brevoSenderEmail,
                    ],
                    'replyTo' => [
                        'name' => $senderName,
                        'email' => $replyToEmail,
                    ],
                    'to' => [
                        ['email' => $toEmail],
                    ],
                    'subject' => $subject,
                    'htmlContent' => $htmlContent,
                ]);

                if ($response->successful()) {
                    Log::info("Email successfully sent to {$toEmail} via Brevo HTTPS API (sender: {$brevoSenderEmail}).");
                    return true;
                } else {
                    Log::warning("Brevo API returned error ({$response->status()}): " . $response->body());
                }
            } catch (\Throwable $e) {
                Log::warning("Brevo HTTPS API connection error: " . $e->getMessage());
            }
        }

        // 2. Try Resend HTTPS API (works on cloud hosts with blocked SMTP ports)
        $resendApiKey = env('RESEND_API_KEY');
        if (!empty($resendApiKey)) {
            try {
                $fromAddress = env('RESEND_FROM', 'onboarding@resend.dev');
                $response = Http::withToken($resendApiKey)->timeout(6)->post('https://api.resend.com/emails', [
                    'from' => "{$senderName} <{$fromAddress}>",
                    'to' => [$toEmail],
                    'subject' => $subject,
                    'html' => $htmlContent,
                ]);

                if ($response->successful()) {
                    Log::info("Email successfully sent to {$toEmail} via Resend HTTPS API.");
                    return true;
                } else {
                    Log::warning("Resend API returned error ({$response->status()}): " . $response->body());
                }
            } catch (\Throwable $e) {
                Log::warning("Resend HTTPS API connection error: " . $e->getMessage());
            }
        }

        // 3. Fallback to standard Laravel Mailer (e.g. SMTP)
        try {
            Mail::to($toEmail)->send($mailable);
            Log::info("Email dispatched via standard Mail transport to {$toEmail}");
            return true;
        } catch (\Throwable $e) {
            Log::warning("Standard Mail transport failed for {$toEmail}: " . $e->getMessage());
            return false;
        }
    }
}
