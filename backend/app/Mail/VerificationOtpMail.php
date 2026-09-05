<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VerificationOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $otp
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Your Ride4Rent Verification Code: {$this->otp}",
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: "
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
                            {$this->otp}
                        </span>
                    </div>
                    <p style='color: #888; font-size: 13px;'>If you did not request this verification code, please ignore this email.</p>
                </div>
                <div style='text-align: center; margin-top: 20px; color: #aaa; font-size: 12px;'>
                    &copy; " . date('Y') . " Ride4Rent. All rights reserved.
                </div>
            </div>
            ",
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
