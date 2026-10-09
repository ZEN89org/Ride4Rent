<?php

namespace App\Console\Commands;

use App\Http\Controllers\API\BookingController;
use Illuminate\Console\Command;

class CheckBookingExpirations extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'bookings:check-expirations';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check and auto-cancel expired booking requests and trigger refund pending workflows';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Checking booking expirations...');
        $controller = new BookingController();
        $controller->checkAndProcessExpirations();
        $this->info('Booking expirations processed successfully.');

        return Command::SUCCESS;
    }
}
