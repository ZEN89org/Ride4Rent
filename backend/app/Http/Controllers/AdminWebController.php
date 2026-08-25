<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class AdminWebController extends Controller
{
    public function loginForm(): View
    {
        return view('admin.login');
    }

    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt([...$credentials, 'role' => 'admin'])) {
            return back()
                ->withInput($request->only('email'))
                ->withErrors(['email' => 'Those credentials do not match an administrator account.']);
        }

        $request->session()->regenerate();

        return redirect()->route('admin.dashboard');
    }

    public function dashboard(): View
    {
        $operators = User::with('operatorProfile')
            ->where('role', 'operator')
            ->where('account_status', 'pending')
            ->latest()
            ->get();

        return view('admin.dashboard', compact('operators'));
    }

    public function approve(User $user): RedirectResponse
    {
        abort_unless($user->role === 'operator', 404);

        $user->update(['account_status' => 'active']);
        $user->operatorProfile?->update([
            'rejection_reason' => null,
            'reviewed_at' => now(),
        ]);

        return back()->with('status', 'Operator approved successfully.');
    }

    public function reject(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->role === 'operator', 404);

        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:1000'],
        ]);

        $user->update(['account_status' => 'rejected']);
        $user->operatorProfile?->update([
            'rejection_reason' => $validated['rejection_reason'],
            'reviewed_at' => now(),
        ]);

        return back()->with('status', 'Operator rejected successfully.');
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }
}
