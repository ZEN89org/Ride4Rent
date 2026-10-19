<!DOCTYPE html>
<html lang="en" class="h-full bg-[#F5F7FA]">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard | Ride4Rent</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #F5F7FA;
            color: #343C6A;
        }
        code, .font-mono { font-family: 'JetBrains Mono', monospace; }

        .bankdash-card {
            background-color: #FFFFFF;
            border-radius: 25px;
            padding: 24px;
            border: 1px solid rgba(223, 234, 242, 0.7);
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.02);
        }

        .bankdash-title {
            font-size: 22px;
            font-weight: 700;
            color: #343C6A;
            letter-spacing: -0.02em;
        }

        /* Sidebar Item States */
        .sidebar-link-active {
            color: #2D60FF;
            font-weight: 700;
            position: relative;
        }
        .sidebar-link-active::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 6px;
            height: 48px;
            background-color: #2D60FF;
            border-top-right-radius: 8px;
            border-bottom-right-radius: 8px;
        }
        .sidebar-link-inactive {
            color: #718EBF;
            font-weight: 600;
            transition: all 0.2s ease;
        }
        .sidebar-link-inactive:hover {
            color: #2D60FF;
            background-color: #F8FAFC;
        }
    </style>
</head>
<body class="admin-shell h-full bg-[#F5F7FA] antialiased flex overflow-hidden">

    <!-- ======================================================== -->
    <!-- LEFT EXECUTIVE SIDEBAR (BankDash Clean White Aesthetic)  -->
    <!-- ======================================================== -->
    <aside id="admin-sidebar" class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col justify-between bg-white border-r border-[#E6EFF5] transition-transform duration-200 lg:static lg:translate-x-0 -translate-x-full select-none">
        <div class="flex flex-col h-full overflow-y-auto">
            <!-- Brand Identity -->
            <div class="flex items-center gap-3 px-7 py-7 border-b border-[#F3F4F6]">
                <div class="admin-brand-icon">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 19L9 5h6l4 14M12 7v3m0 4v3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <div>
                    <span class="admin-brand-title">Ride4Rent<span style="color:#F5C344">.</span></span>
                    <p class="admin-brand-subtitle">Administration</p>
                </div>
            </div>

            <!-- Navigation Links -->
            <nav class="flex-1 py-6 space-y-1.5 text-[15px]">
                <!-- Dashboard / Overview -->
                <button
                    id="nav-dashboard"
                    onclick="switchTab('dashboard')"
                    class="sidebar-link-active flex w-full items-center gap-4 px-8 py-3.5 text-left cursor-pointer transition"
                >
                    <svg class="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>Dashboard</span>
                </button>

                <!-- Commissions & Remittance (Core 10% Feature) -->
                <button
                    id="nav-commissions"
                    onclick="switchTab('commissions')"
                    class="sidebar-link-inactive flex w-full items-center justify-between px-8 py-3.5 text-left cursor-pointer transition"
                >
                    <div class="flex items-center gap-4">
                        <svg class="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span>Commissions</span>
                    </div>
                    @if ($commissionStats['frozen_operators_count'] > 0)
                        <span class="rounded-full bg-[#FE5C73] text-white px-2 py-0.5 text-xs font-bold shadow-sm">
                            {{ $commissionStats['frozen_operators_count'] }}
                        </span>
                    @elseif ($commissionStats['in_grace_count'] > 0)
                        <span class="rounded-full bg-[#FFBB38] text-white px-2 py-0.5 text-xs font-bold shadow-sm">
                            {{ $commissionStats['in_grace_count'] }}
                        </span>
                    @endif
                </button>

                <!-- Operator Accreditation (Business Permit only) -->
                <button
                    id="nav-moderation"
                    onclick="switchTab('moderation')"
                    class="sidebar-link-inactive flex w-full items-center justify-between px-8 py-3.5 text-left cursor-pointer transition"
                >
                    <div class="flex items-center gap-4">
                        <svg class="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Operator Vetting</span>
                    </div>
                    @if ($stats['pending_verifications'] > 0)
                        <span class="rounded-full bg-[#2D60FF] text-white px-2 py-0.5 text-xs font-bold shadow-sm">
                            {{ $stats['pending_verifications'] }}
                        </span>
                    @endif
                </button>

                <!-- Member Directory -->
                <button
                    id="nav-users"
                    onclick="switchTab('users')"
                    class="sidebar-link-inactive flex w-full items-center justify-between px-8 py-3.5 text-left cursor-pointer transition"
                >
                    <div class="flex items-center gap-4">
                        <svg class="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Members</span>
                    </div>
                    <span class="text-xs font-semibold text-[#718EBF] bg-[#F5F7FA] px-2 py-0.5 rounded-full">
                        {{ $stats['total_platform_users'] }}
                    </span>
                </button>

                <!-- Escalation & Disputes -->
                <button
                    id="nav-disputes"
                    onclick="switchTab('disputes')"
                    class="sidebar-link-inactive flex w-full items-center justify-between px-8 py-3.5 text-left cursor-pointer transition"
                >
                    <div class="flex items-center gap-4">
                        <svg class="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Disputes & Claims</span>
                    </div>
                    @if ($disputes->count() > 0)
                        <span class="text-xs font-semibold text-[#718EBF] bg-[#F5F7FA] px-2 py-0.5 rounded-full">
                            {{ $disputes->count() }}
                        </span>
                    @endif
                </button>

                <!-- Review Moderation -->
                <button
                    id="nav-reviews"
                    onclick="switchTab('reviews')"
                    class="sidebar-link-inactive flex w-full items-center justify-between px-8 py-3.5 text-left cursor-pointer transition"
                >
                    <div class="flex items-center gap-4">
                        <svg class="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        <span>Reviews</span>
                    </div>
                </button>

                <!-- Audit Logs -->
                <button
                    id="nav-audit"
                    onclick="switchTab('audit')"
                    class="sidebar-link-inactive flex w-full items-center gap-4 px-8 py-3.5 text-left cursor-pointer transition"
                >
                    <svg class="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>Audit Trail</span>
                </button>

                <!-- Platform Settings -->
                <button
                    id="nav-settings"
                    onclick="switchTab('settings')"
                    class="sidebar-link-inactive flex w-full items-center gap-4 px-8 py-3.5 text-left cursor-pointer transition"
                >
                    <svg class="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Settings</span>
                </button>
            </nav>

            <!-- Bottom Session Card -->
            <div class="admin-session p-6 border-t border-[#F3F4F6]">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-[#F5F7FA] border border-[#DFEAF2] flex items-center justify-center font-bold text-[#343C6A]">
                            {{ strtoupper(substr(Auth::user()->first_name ?? 'A', 0, 1)) }}
                        </div>
                        <div class="overflow-hidden">
                            <p class="text-sm font-bold text-[#343C6A] truncate">{{ Auth::user()->first_name ?? 'Administrator' }}</p>
                            <p class="text-[11px] text-[#718EBF] truncate">{{ Auth::user()->email }}</p>
                        </div>
                    </div>
                    <form method="POST" action="{{ route('admin.logout') }}">
                        @csrf
                        <button type="submit" title="Sign Out" class="text-[#718EBF] hover:text-[#FE5C73] p-1.5 rounded-lg hover:bg-[#F5F7FA] transition">
                            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </aside>

    <!-- ======================================================== -->
    <!-- MAIN APPLICATION CANVAS (BankDash Header & Content)       -->
    <!-- ======================================================== -->
    <button id="sidebar-overlay" class="admin-overlay hidden" aria-label="Close navigation" onclick="closeSidebar()"></button>
    <div class="admin-workspace flex-1 flex flex-col min-w-0 overflow-y-auto">

        <!-- Top Navigation Header -->
        <header class="admin-header bg-white border-b border-[#E6EFF5] sticky top-0 z-30 px-6 lg:px-10 py-5 flex items-center justify-between">
            <div class="flex items-center gap-4">
                <button id="sidebar-toggle" aria-label="Open navigation" aria-controls="admin-sidebar" aria-expanded="false" onclick="toggleSidebar()" class="lg:hidden text-[#718EBF] hover:text-[#343C6A]">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <div><p class="admin-breadcrumb">Workspace / Administration</p><h1 id="page-title" class="text-2xl lg:text-[28px] font-bold text-[#343C6A] tracking-tight">Overview</h1></div>
            </div>

            <!-- Header Right Actions -->
            <div class="flex items-center gap-4 lg:gap-7">
                <!-- Search Pill -->
                <form method="GET" action="{{ route('admin.dashboard') }}" class="relative hidden sm:block w-56 lg:w-72" role="search">
                    <input type="hidden" name="tab" value="users" />
                    <svg class="w-5 h-5 text-[#718EBF] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        name="search" aria-label="Search members" placeholder="Search members…"
                        class="w-full pl-12 pr-4 py-3 rounded-full bg-[#F5F7FA] text-sm text-[#343C6A] placeholder-[#718EBF] border border-transparent focus:border-[#2D60FF] focus:bg-white focus:outline-none transition-all"
                    />
                </form>

                <!-- Settings Button -->
                <button onclick="switchTab('settings')" class="w-12 h-12 rounded-full bg-[#F5F7FA] text-[#718EBF] hover:text-[#2D60FF] hover:bg-white border border-transparent hover:border-[#DFEAF2] flex items-center justify-center transition shadow-sm" title="Settings">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>

                <!-- Notification Bell Button -->
                <button onclick="switchTab('commissions')" class="relative w-12 h-12 rounded-full bg-[#F5F7FA] text-[#FE5C73] hover:text-[#2D60FF] hover:bg-white border border-transparent hover:border-[#DFEAF2] flex items-center justify-center transition shadow-sm" title="Alerts & Remittances">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    @if ($commissionStats['frozen_operators_count'] > 0 || $stats['pending_verifications'] > 0)
                        <span class="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-[#FE5C73] ring-2 ring-white"></span>
                    @endif
                </button>

                <!-- Admin Avatar -->
                <div class="relative cursor-pointer" onclick="switchTab('settings')">
                    <div class="w-12 h-12 rounded-full bg-[#2D60FF] text-white flex items-center justify-center font-bold text-lg ring-2 ring-white shadow-sm overflow-hidden">
                        @if (Auth::user()->profile_photo)
                            <img src="{{ asset('storage/'.Auth::user()->profile_photo) }}" class="w-full h-full object-cover" alt="Admin" />
                        @else
                            {{ strtoupper(substr(Auth::user()->first_name ?? 'A', 0, 1)) }}
                        @endif
                    </div>
                </div>
            </div>
        </header>

        <!-- Alerts & Feedback Banner -->
        @if (session('status'))
            <div class="mx-6 lg:mx-10 mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-sm font-medium shadow-sm">
                <div class="flex items-center gap-3">
                    <svg class="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{{ session('status') }}</span>
                </div>
                <button onclick="this.parentElement.remove()" class="text-emerald-600 hover:text-emerald-900">&times;</button>
            </div>
        @endif

        @if (isset($errors) && $errors->any())
            <div class="mx-6 lg:mx-10 mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium shadow-sm">
                <div class="flex items-center gap-2 mb-1">
                    <svg class="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span class="font-bold">Please check the following errors:</span>
                </div>
                <ul class="list-disc list-inside ml-6 space-y-0.5">
                    @foreach ($errors->all() as $err)
                        <li>{{ $err }}</li>
                    @endforeach
                </ul>
            </div>
        @endif

        <!-- Main Body Container -->
        <main id="admin-main" class="admin-main flex-1 p-6 lg:p-10">

            <!-- ======================================================== -->
            <!-- TAB 1: DASHBOARD / OVERVIEW (BankDash Exact Layout)      -->
            <!-- ======================================================== -->
            <div id="tab-dashboard" class="tab-content space-y-8">
                <section class="admin-welcome" aria-label="Marketplace overview">
                    <div><p class="admin-eyebrow">The Ride4Rent workspace</p><h2>Your marketplace, at a glance.</h2><p>Keep rentals moving. Review your community, payments, and pending applications.</p></div>
                    <time class="admin-date" datetime="{{ now()->timezone('Asia/Manila')->toDateString() }}">{{ now()->timezone('Asia/Manila')->format('l, d M Y') }}</time>
                </section>
                <section class="admin-stat-grid" aria-label="Marketplace statistics">
                    @foreach ([['Renters', $stats['total_renters'], 'Registered renter accounts', 'users'], ['Active operators', $stats['active_operators'], 'Ready to serve your community', 'users'], ['Pending applications', $stats['pending_verifications'], 'Awaiting your review', 'moderation'], ['Suspended accounts', $stats['suspended_accounts'], 'Review account status', 'users']] as [$label, $value, $caption, $destination])
                        <button onclick="switchTab('{{ $destination }}')" class="admin-stat {{ $destination === 'moderation' ? 'admin-stat--attention' : '' }} text-left cursor-pointer">
                            <span class="admin-stat-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 17l5-5 4 3 7-9M15 6h5v5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
                            <span class="admin-stat-label">{{ $label }}</span><strong>{{ number_format($value) }}</strong><small>{{ $caption }} ↗</small>
                        </button>
                    @endforeach
                </section>


                <!-- Row 1: Cards & Recent Remittances -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                    <div class="lg:col-span-8 flex flex-col">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="bankdash-title">Commission overview</h2>
                            <button onclick="switchTab('commissions')" class="admin-text-link">View statements ↗</button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
                            <article class="admin-finance-card admin-finance-card--dark">
                                <div><p>Commission due this month</p><strong>₱{{ number_format($commissionStats['current_month_commission'], 2) }}</strong></div>
                                <footer><span>{{ now()->timezone('Asia/Manila')->format('F Y') }}</span><span>Monthly billing cycle</span></footer>
                            </article>
                            <article class="admin-finance-card">
                                <div><p>Awaiting collection</p><strong>₱{{ number_format($commissionStats['current_month_pending'], 2) }}</strong></div>
                                <footer><span>Current month</span><button onclick="switchTab('commissions')" class="admin-text-link">Review payments →</button></footer>
                            </article>
                        </div>
                    </div>

                    <!-- Right: Recent Remittances (Transactions) -->
                    <div class="lg:col-span-4 flex flex-col">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="bankdash-title">Recent remittances</h2>
                        </div>
                        <div class="bankdash-card flex-1 flex flex-col justify-around space-y-4">
                            @forelse ($recentRemittances as $remit)
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3.5">
                                        <!-- Category Icon Pill -->
                                        @if ($remit->payment_method === 'gcash')
                                            <div class="w-12 h-12 rounded-full bg-[#FFF5D9] text-[#FFBB38] flex items-center justify-center flex-shrink-0">
                                                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                                                </svg>
                                            </div>
                                        @elseif ($remit->status === 'verified')
                                            <div class="w-12 h-12 rounded-full bg-[#DCFAF8] text-[#16DBCC] flex items-center justify-center flex-shrink-0">
                                                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                        @else
                                            <div class="w-12 h-12 rounded-full bg-[#E7EDFF] text-[#2D60FF] flex items-center justify-center flex-shrink-0">
                                                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                            </div>
                                        @endif

                                        <div>
                                            <p class="text-sm font-bold text-[#343C6A] leading-tight">
                                                {{ $remit->operator?->operatorProfile?->business_name ?: trim(($remit->operator?->first_name ?? 'Operator').' '.($remit->operator?->last_name ?? '')) }}
                                            </p>
                                            <p class="text-xs text-[#718EBF] mt-0.5">
                                                {{ $remit->submitted_at ? $remit->submitted_at->format('d F Y') : \Carbon\Carbon::createFromFormat('Y-m', $remit->billing_month)->format('F Y') }}
                                            </p>
                                        </div>
                                    </div>

                                    <div class="text-right">
                                        @if ($remit->status === 'verified')
                                            <span class="text-sm font-bold text-[#16DBCC]">+₱{{ number_format((float) $remit->commission_due, 2) }}</span>
                                        @elseif ($remit->status === 'frozen' || $remit->status === 'overdue')
                                            <span class="text-sm font-bold text-[#FE5C73]">-₱{{ number_format((float) $remit->commission_due, 2) }}</span>
                                        @else
                                            <span class="text-sm font-bold text-[#2D60FF]">₱{{ number_format((float) $remit->commission_due, 2) }}</span>
                                        @endif
                                    </div>
                                </div>
                            @empty
                                <div class="text-center py-6 text-xs text-[#718EBF]">
                                    No commission remittances recorded for this cycle.
                                </div>
                            @endforelse
                        </div>
                    </div>
                </div>

                <!-- Row 2: Weekly Activity Dual-Bar Chart & Fleet Distribution Donut Chart -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                    <!-- Left: Weekly Activity Dual-Bar Chart -->
                    <div class="lg:col-span-8 flex flex-col">
                        <div class="admin-chart-header flex items-center justify-between mb-4">
                            <h2 class="bankdash-title">Trip & commission activity</h2>
                            <!-- Legend -->
                            <div class="admin-chart-legend flex items-center gap-6 text-xs font-medium text-[#718EBF]">
                                <div class="flex items-center gap-2">
                                    <span class="w-3 h-3 rounded-full" style="background:#2C6250"></span>
                                    <span>Completed Trips</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="w-3 h-3 rounded-full" style="background:#E4B744"></span>
                                    <span>10% Commission (₱)</span>
                                </div>
                            </div>
                        </div>
                        <div class="bankdash-card admin-chart-frame flex-1 min-h-[320px]">
                            <canvas role="img" aria-label="Completed trips and commission for the last seven days" id="weeklyActivityChart" height="130"></canvas>
                        </div>
                    </div>

                    <!-- Right: Fleet Distribution Donut Chart -->
                    <div class="lg:col-span-4 flex flex-col">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="bankdash-title">Fleet distribution</h2>
                        </div>
                        <div class="bankdash-card admin-chart-frame flex-1 flex flex-col items-center justify-center min-h-[320px]">
                            <div class="w-full max-w-[260px] h-[260px] relative">
                                <canvas role="img" aria-label="Vehicle types in the platform fleet" id="fleetPieChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Row 3: Quick Transfer & Balance History Spline Chart -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                    <!-- Left: Quick Remittance Action (Quick Transfer) -->
                    <div class="lg:col-span-5 flex flex-col">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="bankdash-title">Operator workspace</h2>
                        </div>
                        <div class="bankdash-card flex-1 flex flex-col justify-between space-y-6">
                            <!-- Operator Avatars Row -->
                            <div class="flex items-center gap-4 overflow-x-auto pb-2">
                                @forelse ($quickActionOperators as $qOp)
                                    <div class="flex flex-col items-center min-w-[70px] text-center cursor-pointer group" onclick="selectQuickOperator('{{ $qOp->id }}', '{{ $qOp->first_name }}')">
                                        <div class="w-14 h-14 rounded-full bg-[#F5F7FA] border-2 border-[#DFEAF2] group-hover:border-[#2D60FF] flex items-center justify-center overflow-hidden transition shadow-sm">
                                            @if ($qOp->profile_photo)
                                                <img src="{{ asset('storage/'.$qOp->profile_photo) }}" class="w-full h-full object-cover" alt="Operator" />
                                            @else
                                                <span class="font-bold text-[#343C6A] text-base">{{ strtoupper(substr($qOp->first_name, 0, 1)) }}</span>
                                            @endif
                                        </div>
                                        <p class="text-xs font-bold text-[#343C6A] mt-2 truncate w-16">{{ $qOp->first_name }}</p>
                                        <p class="text-[10px] text-[#718EBF] truncate w-16">{{ $qOp->operatorProfile?->business_name ? 'Operator' : 'Host' }}</p>
                                    </div>
                                @empty
                                    <p class="text-xs text-[#718EBF] py-4">No active operators listed.</p>
                                @endforelse
                                <button onclick="switchTab('commissions')" class="w-12 h-12 rounded-full border border-[#DFEAF2] bg-white flex items-center justify-center text-[#718EBF] hover:text-[#2D60FF] shadow-sm flex-shrink-0" title="View all">
                                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>

                            <!-- Action Form -->
                            <div class="flex items-center gap-3">
                                <span class="text-xs font-semibold text-[#718EBF] flex-shrink-0">Cycle Audit</span>
                                <form method="POST" action="{{ route('admin.remittances.sync') }}" class="flex-1 flex items-center bg-[#F5F7FA] rounded-full pl-4 pr-1 py-1 border border-[#DFEAF2] focus-within:border-[#2D60FF]">
                                    @csrf
                                    <input type="hidden" name="month" value="{{ $selectedMonth }}" />
                                    <input type="text" readonly value="{{ \Carbon\Carbon::createFromFormat('Y-m', $selectedMonth)->format('F Y') }} (10%)" class="w-full bg-transparent text-xs font-bold text-[#343C6A] outline-none" />
                                    <button type="submit" class="bg-[#2D60FF] hover:bg-blue-700 text-white rounded-full px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-blue-500/20">
                                        <span>Audit</span>
                                        <svg class="w-3.5 h-3.5 transform rotate-45" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                                        </svg>
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Revenue History Smooth Spline Chart (Balance History) -->
                    <div class="lg:col-span-7 flex flex-col">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="bankdash-title">Commission history</h2>
                        </div>
                        <div class="bankdash-card admin-chart-frame flex-1 min-h-[240px]">
                            <canvas role="img" aria-label="Monthly platform commission history" id="balanceHistoryChart" height="100"></canvas>
                        </div>
                    </div>
                </div>

            </div>

            <!-- ======================================================== -->
            <!-- TAB 2: COMMISSIONS & REMITTANCE MANAGEMENT (NEW ENGINE)  -->
            <!-- ======================================================== -->
            <div id="tab-commissions" class="tab-content hidden space-y-8">

                <!-- Grace Period Operational Notice -->
                <div class="bankdash-card bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white border-blue-200">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#2D60FF] text-white">48-Hour Grace Protocol Active</span>
                                <span class="text-xs font-semibold text-[#718EBF]">Cycle: {{ \Carbon\Carbon::createFromFormat('Y-m', $selectedMonth)->format('F Y') }}</span>
                            </div>
                            <h3 class="text-lg font-bold text-[#343C6A] mt-1.5">Automated Operator Remittance Governance</h3>
                            <p class="text-xs text-[#718EBF] mt-0.5 max-w-2xl">
                                Operators retain 90% of trip gross and remit 10% platform commission at month-end. Upon cycle close, a strict 48-hour grace window triggers. If remittance proof is not verified before grace expires, operator accounts are automatically suspended and blocked from new bookings.
                            </p>
                        </div>
                        <form method="POST" action="{{ route('admin.remittances.sync') }}" class="flex-shrink-0">
                            @csrf
                            <input type="hidden" name="month" value="{{ $selectedMonth }}" />
                            <button type="submit" class="w-full md:w-auto px-5 py-2.5 rounded-full bg-[#2D60FF] hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-blue-500/20">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Run Grace Audit & Sync</span>
                            </button>
                        </form>
                    </div>
                </div>

                <!-- KPI Metric Cards Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <!-- Total Accrued -->
                    <div class="bankdash-card flex items-center gap-4">
                        <div class="w-14 h-14 rounded-full bg-[#E7EDFF] text-[#2D60FF] flex items-center justify-center flex-shrink-0">
                            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p class="text-xs font-semibold text-[#718EBF]">10% Commission Accrued</p>
                            <h3 class="text-xl font-bold text-[#343C6A] mt-0.5">₱{{ number_format($commissionStats['current_month_commission'], 2) }}</h3>
                            <p class="text-[10px] text-[#718EBF] mt-0.5">Cycle Gross: ₱{{ number_format($commissionStats['current_month_gross'], 2) }}</p>
                        </div>
                    </div>

                    <!-- Total Collected -->
                    <div class="bankdash-card flex items-center gap-4">
                        <div class="w-14 h-14 rounded-full bg-[#DCFAF8] text-[#16DBCC] flex items-center justify-center flex-shrink-0">
                            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p class="text-xs font-semibold text-[#718EBF]">Verified & Collected</p>
                            <h3 class="text-xl font-bold text-[#16DBCC] mt-0.5">₱{{ number_format($commissionStats['current_month_collected'], 2) }}</h3>
                            <p class="text-[10px] text-[#718EBF] mt-0.5">All-Time: ₱{{ number_format($commissionStats['total_commission_collected'], 2) }}</p>
                        </div>
                    </div>

                    <!-- Pending / In Grace -->
                    <div class="bankdash-card flex items-center gap-4">
                        <div class="w-14 h-14 rounded-full bg-[#FFF5D9] text-[#FFBB38] flex items-center justify-center flex-shrink-0">
                            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p class="text-xs font-semibold text-[#718EBF]">Pending in 48h Grace</p>
                            <h3 class="text-xl font-bold text-[#FFBB38] mt-0.5">₱{{ number_format($commissionStats['current_month_pending'], 2) }}</h3>
                            <p class="text-[10px] text-[#718EBF] mt-0.5">{{ $commissionStats['in_grace_count'] }} Operator(s) In Window</p>
                        </div>
                    </div>

                    <!-- Frozen Operators -->
                    <div class="bankdash-card flex items-center gap-4">
                        <div class="w-14 h-14 rounded-full bg-[#FFE0EB] text-[#FE5C73] flex items-center justify-center flex-shrink-0">
                            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                        </div>
                        <div>
                            <p class="text-xs font-semibold text-[#718EBF]">Overdue Accounts Frozen</p>
                            <h3 class="text-xl font-bold text-[#FE5C73] mt-0.5">{{ $commissionStats['frozen_operators_count'] }} Operator(s)</h3>
                            <p class="text-[10px] text-[#FE5C73] mt-0.5">Rentals Automatically Blocked</p>
                        </div>
                    </div>
                </div>

                <!-- Monthly Statements Table Section -->
                <div class="bankdash-card space-y-6">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 class="bankdash-title">Operator Remittance Statements</h2>
                            <p class="text-xs text-[#718EBF] mt-0.5">Monthly 10% platform commission statements with proof review and freeze controls</p>
                        </div>

                        <!-- Month Filter Dropdown -->
                        <form method="GET" action="{{ route('admin.dashboard') }}" class="flex items-center gap-3">
                            <input type="hidden" name="tab" value="commissions" />
                            <select name="month" onchange="this.form.submit()" class="px-4 py-2 rounded-full bg-[#F5F7FA] text-xs font-bold text-[#343C6A] border border-[#DFEAF2] focus:border-[#2D60FF] outline-none">
                                @foreach ($availableMonths as $m)
                                    <option value="{{ $m }}" {{ $selectedMonth === $m ? 'selected' : '' }}>
                                        {{ \Carbon\Carbon::createFromFormat('Y-m', $m)->format('F Y') }}
                                    </option>
                                @endforeach
                            </select>
                        </form>
                    </div>

                    <!-- Table -->
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="text-[#718EBF] uppercase tracking-wider text-[10px] border-b border-[#F3F4F6]">
                                    <th class="pb-3 font-bold">Operator & Business</th>
                                    <th class="pb-3 font-bold">Trips</th>
                                    <th class="pb-3 font-bold">Gross Volume</th>
                                    <th class="pb-3 font-bold">10% Due</th>
                                    <th class="pb-3 font-bold">Grace Window</th>
                                    <th class="pb-3 font-bold">Payment Proof</th>
                                    <th class="pb-3 font-bold">Account State</th>
                                    <th class="pb-3 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-[#F3F4F6]">
                                @forelse ($monthlyRemittances as $remit)
                                    @php
                                        $op = $remit->operator;
                                        $prof = $op?->operatorProfile;
                                        $isFrozen = ($op?->account_status === 'suspended');
                                    @endphp
                                    <tr class="hover:bg-[#F8FAFC] transition">
                                        <!-- Operator Info -->
                                        <td class="py-4">
                                            <div class="flex items-center gap-3">
                                                <div class="w-9 h-9 rounded-full bg-[#E7EDFF] text-[#2D60FF] flex items-center justify-center font-bold text-xs flex-shrink-0">
                                                    {{ strtoupper(substr($op?->first_name ?? 'O', 0, 1)) }}
                                                </div>
                                                <div>
                                                    <p class="font-bold text-[#343C6A] text-sm">{{ $prof?->business_name ?: trim(($op?->first_name ?? '').' '.($op?->last_name ?? '')) }}</p>
                                                    <p class="text-[11px] text-[#718EBF]">{{ $op?->email }} &bull; {{ $op?->mobile_number ?: 'No phone' }}</p>
                                                </div>
                                            </div>
                                        </td>

                                        <!-- Completed Trips -->
                                        <td class="py-4">
                                            <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-[#F5F7FA] text-[#343C6A]">
                                                {{ $remit->completed_trips_count }} trips
                                            </span>
                                        </td>

                                        <!-- Gross Volume -->
                                        <td class="py-4 font-semibold text-[#343C6A]">
                                            ₱{{ number_format((float) $remit->gross_revenue, 2) }}
                                        </td>

                                        <!-- 10% Due -->
                                        <td class="py-4 font-bold text-[#2D60FF] text-sm">
                                            ₱{{ number_format((float) $remit->commission_due, 2) }}
                                        </td>

                                        <!-- Grace Period Status -->
                                        <td class="py-4">
                                            @if ($remit->status === 'verified')
                                                <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                                    Settled
                                                </span>
                                            @elseif ($remit->isGraceExpired())
                                                <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1 w-max">
                                                    <span class="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                                                    Grace Expired
                                                </span>
                                            @else
                                                <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                                                    {{ $remit->grace_hours_remaining }}h remaining
                                                </span>
                                            @endif
                                        </td>

                                        <!-- Payment Proof Status -->
                                        <td class="py-4">
                                            @if ($remit->receipt_image)
                                                <button
                                                    type="button"
                                                    onclick="openProofModal('{{ $remit->id }}', '{{ $remit->receipt_image_url }}', '{{ $remit->payment_method }}', '{{ $remit->payment_reference }}', '{{ number_format((float) $remit->commission_due, 2) }}', '{{ $remit->billing_month }}', '{{ $op?->first_name }} {{ $op?->last_name }}', '{{ $remit->status }}')"
                                                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E7EDFF] text-[#2D60FF] font-bold text-xs hover:bg-blue-600 hover:text-white transition"
                                                >
                                                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    <span>View Proof</span>
                                                </button>
                                            @elseif ($remit->status === 'verified')
                                                <span class="text-xs text-emerald-600 font-semibold">Confirmed Manual</span>
                                            @else
                                                <span class="text-xs text-[#718EBF] italic">No proof submitted</span>
                                            @endif
                                        </td>

                                        <!-- Account Status -->
                                        <td class="py-4">
                                            @if ($isFrozen)
                                                <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                    Frozen (Suspended)
                                                </span>
                                            @else
                                                <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    Active
                                                </span>
                                            @endif
                                        </td>

                                        <!-- Action Buttons -->
                                        <td class="py-4 text-right space-x-2">
                                            @if ($remit->status !== 'verified')
                                                <form method="POST" action="{{ route('admin.remittances.verify', $remit) }}" class="inline">
                                                    @csrf
                                                    <button type="submit" class="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm" title="Confirm remittance payment and unfreeze operator">
                                                        Confirm Payment
                                                    </button>
                                                </form>
                                            @endif

                                            @if ($op)
                                                <form method="POST" action="{{ route('admin.operators.toggle-freeze', $op) }}" class="inline">
                                                    @csrf
                                                    <button
                                                        type="submit"
                                                        class="px-3.5 py-1.5 rounded-full font-bold text-xs transition {{ $isFrozen ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-rose-100 hover:bg-rose-200 text-rose-700' }}"
                                                        title="{{ $isFrozen ? 'Unfreeze operator account' : 'Freeze operator account' }}"
                                                    >
                                                        {{ $isFrozen ? 'Unfreeze' : 'Freeze' }}
                                                    </button>
                                                </form>
                                            @endif
                                        </td>
                                    </tr>
                                @empty
                                    <tr>
                                        <td colspan="8" class="py-8 text-center text-xs text-[#718EBF]">
                                            No operator commission statements found for {{ \Carbon\Carbon::createFromFormat('Y-m', $selectedMonth)->format('F Y') }}.
                                        </td>
                                    </tr>
                                @endforelse
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <!-- ======================================================== -->
            <!-- TAB 3: OPERATOR ACCREDITATION (BUSINESS PERMITS ONLY)    -->
            <!-- ======================================================== -->
            <div id="tab-moderation" class="tab-content hidden space-y-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="bankdash-title">Operator Business Accreditation</h2>
                        <p class="text-xs text-[#718EBF] mt-0.5">Vetting commercial vehicle hosts (Mayor's Permits, DTI, SEC, BIR). Renter driver licenses are handled exclusively by operators.</p>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-[#E7EDFF] text-[#2D60FF]">
                        {{ $operators->count() }} Pending Application(s)
                    </span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    @forelse ($operators as $op)
                        @php $prof = $op->operatorProfile; @endphp
                        <div class="bankdash-card flex flex-col justify-between space-y-5">
                            <div>
                                <div class="flex items-start justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="w-12 h-12 rounded-full bg-[#F5F7FA] border border-[#DFEAF2] flex items-center justify-center font-bold text-[#343C6A] text-lg">
                                            {{ strtoupper(substr($op->first_name, 0, 1)) }}
                                        </div>
                                        <div>
                                            <h3 class="font-bold text-[#343C6A] text-base">{{ $prof?->business_name ?: $op->first_name.' '.$op->last_name }}</h3>
                                            <p class="text-xs text-[#718EBF]">{{ $op->email }} &bull; {{ $op->mobile_number }}</p>
                                        </div>
                                    </div>
                                    <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                        Pending Review
                                    </span>
                                </div>

                                <div class="mt-4 p-3 rounded-xl bg-[#F8FAFC] border border-[#DFEAF2] space-y-1.5 text-xs text-[#343C6A]">
                                    <p><span class="text-[#718EBF]">Address:</span> {{ $prof ? ($prof->street_address.', '.$prof->barangay.', '.$prof->municipality) : 'N/A' }}</p>
                                    <p><span class="text-[#718EBF]">Submitted:</span> {{ $op->created_at?->format('M d, Y h:i A') }}</p>
                                    @if ($prof?->rejection_reason)
                                        <p class="text-rose-600"><span class="font-bold">Prior Rejection:</span> {{ $prof->rejection_reason }}</p>
                                    @endif
                                </div>

                                <!-- Document Photos -->
                                <div class="mt-4 grid grid-cols-2 gap-3">
                                    @if ($prof?->business_permit_front)
                                        <a href="{{ asset('storage/'.$prof->business_permit_front) }}" target="_blank" class="block rounded-xl overflow-hidden border border-[#DFEAF2] group relative">
                                            <img src="{{ asset('storage/'.$prof->business_permit_front) }}" class="w-full h-28 object-cover group-hover:scale-105 transition" alt="Business Permit" />
                                            <span class="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm">Permit Front</span>
                                        </a>
                                    @endif
                                    @if ($prof?->business_permit_back)
                                        <a href="{{ asset('storage/'.$prof->business_permit_back) }}" target="_blank" class="block rounded-xl overflow-hidden border border-[#DFEAF2] group relative">
                                            <img src="{{ asset('storage/'.$prof->business_permit_back) }}" class="w-full h-28 object-cover group-hover:scale-105 transition" alt="Permit Back" />
                                            <span class="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm">Permit Back</span>
                                        </a>
                                    @endif
                                </div>
                            </div>

                            <!-- Decision Actions -->
                            <div class="flex items-center gap-3 pt-4 border-t border-[#F3F4F6]">
                                <form method="POST" action="{{ route('admin.operators.approve', $op) }}" class="flex-1">
                                    @csrf
                                    <button type="submit" class="w-full py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm">
                                        Accredit Operator
                                    </button>
                                </form>
                                <button
                                    type="button"
                                    onclick="openRejectModal('{{ $op->id }}', '{{ $prof?->business_name ?: $op->first_name }}')"
                                    class="flex-1 py-2.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition"
                                >
                                    Reject Application
                                </button>
                            </div>
                        </div>
                    @empty
                        <div class="col-span-2 bankdash-card text-center py-12 text-[#718EBF] text-sm">
                            <svg class="w-12 h-12 mx-auto text-[#718EBF]/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            All operator applications have been reviewed. Moderation queue is clear!
                        </div>
                    @endforelse
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- TAB 4: MEMBERS DIRECTORY                                 -->
            <!-- ======================================================== -->
            <div id="tab-users" class="tab-content hidden space-y-6">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 class="bankdash-title">Platform Members Directory</h2>
                        <p class="text-xs text-[#718EBF] mt-0.5">Manage renters and commercial operators across Ride4Rent</p>
                    </div>

                    <!-- Filter Form -->
                    <form method="GET" action="{{ route('admin.dashboard') }}" class="flex items-center gap-3">
                        <input type="hidden" name="tab" value="users" />
                        <input
                            type="text"
                            name="search"
                            value="{{ request('search') }}"
                            placeholder="Search name, email, mobile..."
                            class="px-4 py-2 rounded-full bg-white border border-[#DFEAF2] text-xs font-semibold text-[#343C6A] outline-none focus:border-[#2D60FF]"
                        />
                        <select name="role" onchange="this.form.submit()" class="px-4 py-2 rounded-full bg-white border border-[#DFEAF2] text-xs font-semibold text-[#343C6A] outline-none">
                            <option value="all" {{ request('role') === 'all' ? 'selected' : '' }}>All Roles</option>
                            <option value="operator" {{ request('role') === 'operator' ? 'selected' : '' }}>Operators</option>
                            <option value="renter" {{ request('role') === 'renter' ? 'selected' : '' }}>Renters</option>
                        </select>
                    </form>
                </div>

                <div class="bankdash-card overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead>
                            <tr class="text-[#718EBF] uppercase tracking-wider text-[10px] border-b border-[#F3F4F6]">
                                <th class="pb-3 font-bold">Member</th>
                                <th class="pb-3 font-bold">Role</th>
                                <th class="pb-3 font-bold">Contact</th>
                                <th class="pb-3 font-bold">Account Status</th>
                                <th class="pb-3 font-bold">Registered</th>
                                <th class="pb-3 font-bold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-[#F3F4F6]">
                            @forelse ($allUsers as $u)
                                <tr class="hover:bg-[#F8FAFC] transition">
                                    <td class="py-4">
                                        <div class="flex items-center gap-3">
                                            <div class="w-9 h-9 rounded-full bg-[#E7EDFF] text-[#2D60FF] flex items-center justify-center font-bold text-xs flex-shrink-0">
                                                {{ strtoupper(substr($u->first_name, 0, 1)) }}
                                            </div>
                                            <div>
                                                <p class="font-bold text-[#343C6A] text-sm">{{ $u->first_name }} {{ $u->last_name }}</p>
                                                <p class="text-[11px] text-[#718EBF]">{{ $u->email }}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="py-4">
                                        <span class="px-2.5 py-1 rounded-full text-xs font-bold {{ $u->role === 'operator' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800' }}">
                                            {{ ucfirst($u->role) }}
                                        </span>
                                    </td>
                                    <td class="py-4 text-[#343C6A]">
                                        {{ $u->mobile_number ?: 'N/A' }}
                                    </td>
                                    <td class="py-4">
                                        @if ($u->account_status === 'active')
                                            <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Active</span>
                                        @elseif ($u->account_status === 'suspended')
                                            <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">Suspended / Frozen</span>
                                        @else
                                            <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">{{ ucfirst($u->account_status) }}</span>
                                        @endif
                                    </td>
                                    <td class="py-4 text-[#718EBF]">
                                        {{ $u->created_at?->format('M d, Y') }}
                                    </td>
                                    <td class="py-4 text-right">
                                        <form method="POST" action="{{ route('admin.users.toggle-status', $u) }}" class="inline">
                                            @csrf
                                            <button type="submit" class="px-3 py-1.5 rounded-full text-xs font-bold transition {{ $u->account_status === 'active' ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' }}">
                                                {{ $u->account_status === 'active' ? 'Freeze / Suspend' : 'Activate' }}
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="6" class="py-8 text-center text-xs text-[#718EBF]">No members matched your search.</td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- TAB 5: DISPUTES & CLAIMS                                 -->
            <!-- ======================================================== -->
            <div id="tab-disputes" class="tab-content hidden space-y-6">
                <div>
                    <h2 class="bankdash-title">Disputes & Incident Escalations</h2>
                    <p class="text-xs text-[#718EBF] mt-0.5">Track booking cancellations, damage/fuel surcharges, and log executive arbitration memos</p>
                </div>

                <div class="space-y-4">
                    @forelse ($disputes as $disp)
                        <div class="bankdash-card">
                            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F3F4F6] pb-4">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="font-bold text-[#343C6A] text-base">Booking #{{ $disp->id }}</span>
                                        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">{{ strtoupper($disp->status) }}</span>
                                    </div>
                                    <p class="text-xs text-[#718EBF] mt-0.5">
                                        Vehicle: <span class="font-semibold text-[#343C6A]">{{ $disp->vehicle?->name }}</span> &bull;
                                        Renter: <span class="font-semibold text-[#343C6A]">{{ $disp->renter?->first_name }} {{ $disp->renter?->last_name }}</span> &bull;
                                        Operator: <span class="font-semibold text-[#343C6A]">{{ $disp->operator?->first_name }} {{ $disp->operator?->last_name }}</span>
                                    </p>
                                </div>
                                <div class="text-right">
                                    <span class="text-xs text-[#718EBF]">Total Amount</span>
                                    <p class="text-lg font-bold text-[#343C6A]">₱{{ number_format((float) $disp->total_price, 2) }}</p>
                                </div>
                            </div>

                            <div class="py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <span class="text-[#718EBF]">Fuel Surcharge</span>
                                    <p class="font-bold text-[#343C6A]">₱{{ number_format((float) $disp->fuel_charge, 2) }}</p>
                                </div>
                                <div>
                                    <span class="text-[#718EBF]">Damage Charge</span>
                                    <p class="font-bold text-[#343C6A]">₱{{ number_format((float) $disp->damage_charge, 2) }}</p>
                                </div>
                                <div>
                                    <span class="text-[#718EBF]">Late Fee</span>
                                    <p class="font-bold text-[#343C6A]">₱{{ number_format((float) $disp->late_fee, 2) }}</p>
                                </div>
                                <div>
                                    <span class="text-[#718EBF]">Resolution Memo</span>
                                    <p class="font-bold {{ $disp->admin_memo ? 'text-emerald-700' : 'text-amber-700' }}">
                                        {{ $disp->admin_memo ? 'Logged' : 'Pending Memo' }}
                                    </p>
                                </div>
                            </div>

                            <form method="POST" action="{{ route('admin.disputes.memo', $disp) }}" class="flex items-center gap-3 pt-3 border-t border-[#F3F4F6]">
                                @csrf
                                <input
                                    type="text"
                                    name="admin_memo"
                                    value="{{ $disp->admin_memo }}"
                                    placeholder="Add executive arbitration or resolution note..."
                                    class="flex-1 px-4 py-2.5 rounded-full bg-[#F5F7FA] border border-[#DFEAF2] text-xs text-[#343C6A] outline-none focus:border-[#2D60FF]"
                                />
                                <button type="submit" class="px-5 py-2.5 rounded-full bg-[#2D60FF] hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm">
                                    Save Memo
                                </button>
                            </form>
                        </div>
                    @empty
                        <div class="bankdash-card text-center py-10 text-xs text-[#718EBF]">
                            No disputes or incident escalations logged.
                        </div>
                    @endforelse
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- TAB 6: REVIEW MODERATION                                 -->
            <!-- ======================================================== -->
            <div id="tab-reviews" class="tab-content hidden space-y-6">
                <div>
                    <h2 class="bankdash-title">Review & Community Guidelines Moderation</h2>
                    <p class="text-xs text-[#718EBF] mt-0.5">Audit customer ratings and reviews to protect marketplace integrity</p>
                </div>

                <div class="bankdash-card space-y-4">
                    @forelse ($reviews as $rev)
                        <div class="flex items-start justify-between p-4 rounded-2xl bg-[#F8FAFC] border border-[#DFEAF2]">
                            <div class="space-y-1">
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-[#343C6A] text-sm">{{ $rev->renter?->first_name }} {{ $rev->renter?->last_name }}</span>
                                    <span class="text-xs text-amber-500 font-bold">&#9733; {{ $rev->rating }}/5</span>
                                    <span class="text-xs text-[#718EBF]">&bull; {{ $rev->vehicle?->name }}</span>
                                </div>
                                <p class="text-xs text-[#343C6A] {{ $rev->is_review_hidden ? 'line-through text-slate-400' : '' }}">
                                    "{{ $rev->review ?: 'No written comment.' }}"
                                </p>
                            </div>
                            <form method="POST" action="{{ route('admin.reviews.toggle-visibility', $rev) }}">
                                @csrf
                                <button type="submit" class="px-3 py-1.5 rounded-full font-bold text-xs transition {{ $rev->is_review_hidden ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800' }}">
                                    {{ $rev->is_review_hidden ? 'Restore' : 'Hide Review' }}
                                </button>
                            </form>
                        </div>
                    @empty
                        <p class="text-xs text-[#718EBF] py-6 text-center">No customer reviews submitted yet.</p>
                    @endforelse
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- TAB 7: AUDIT TRAIL                                       -->
            <!-- ======================================================== -->
            <div id="tab-audit" class="tab-content hidden space-y-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="bankdash-title">Platform Audit Trail</h2>
                        <p class="text-xs text-[#718EBF] mt-0.5">Tamper-evident logs of executive admin actions and automated events</p>
                    </div>
                    <a href="{{ route('admin.exports.audit-logs') }}" class="px-5 py-2.5 rounded-full bg-white border border-[#DFEAF2] hover:border-[#2D60FF] text-[#2D60FF] font-bold text-xs transition shadow-sm flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Export CSV</span>
                    </a>
                </div>

                <div class="bankdash-card overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead>
                            <tr class="text-[#718EBF] uppercase tracking-wider text-[10px] border-b border-[#F3F4F6]">
                                <th class="pb-3 font-bold">Timestamp</th>
                                <th class="pb-3 font-bold">Admin / System</th>
                                <th class="pb-3 font-bold">Action</th>
                                <th class="pb-3 font-bold">Details</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-[#F3F4F6]">
                            @forelse ($auditLogs as $log)
                                <tr class="hover:bg-[#F8FAFC] transition">
                                    <td class="py-3.5 text-[#718EBF] font-mono text-[11px] whitespace-nowrap">
                                        {{ $log->created_at?->format('Y-m-d H:i:s') }}
                                    </td>
                                    <td class="py-3.5 font-bold text-[#343C6A]">
                                        {{ $log->admin_name ?: 'Automated System' }}
                                    </td>
                                    <td class="py-3.5">
                                        <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#F5F7FA] text-[#2D60FF]">
                                            {{ $log->action }}
                                        </span>
                                    </td>
                                    <td class="py-3.5 text-[#343C6A] max-w-md">
                                        {{ $log->details }}
                                    </td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="4" class="py-6 text-center text-xs text-[#718EBF]">No audit logs recorded yet.</td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- TAB 8: OPERATIONAL SETTINGS                              -->
            <!-- ======================================================== -->
            <div id="tab-settings" class="tab-content hidden space-y-6">
                <div>
                    <h2 class="bankdash-title">System & Governance Settings</h2>
                    <p class="text-xs text-[#718EBF] mt-0.5">Control platform commission rates, booking rules, and administrative emergency toggles</p>
                </div>

                <div class="bankdash-card max-w-2xl">
                    <form method="POST" action="{{ route('admin.settings.update') }}" class="space-y-5 text-xs">
                        @csrf
                        <div>
                            <label class="block font-bold text-[#343C6A] mb-1.5">Platform Commission Rate (%)</label>
                            <input
                                type="number"
                                step="0.5"
                                name="platform_fee_percent"
                                value="{{ $platformSettings['platform_fee_percent'] }}"
                                class="w-full px-4 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#DFEAF2] text-[#343C6A] font-bold outline-none focus:border-[#2D60FF]"
                            />
                            <p class="text-[11px] text-[#718EBF] mt-1">Default is 10% calculated automatically on completed bookings.</p>
                        </div>

                        <div>
                            <label class="block font-bold text-[#343C6A] mb-1.5">Emergency Maintenance Mode</label>
                            <select name="maintenance_mode" class="w-full px-4 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#DFEAF2] text-[#343C6A] font-bold outline-none focus:border-[#2D60FF]">
                                <option value="0" {{ $platformSettings['maintenance_mode'] == '0' ? 'selected' : '' }}>Disabled (Platform Operating Normally)</option>
                                <option value="1" {{ $platformSettings['maintenance_mode'] == '1' ? 'selected' : '' }}>Enabled (Hold New Reservations)</option>
                            </select>
                        </div>

                        <div>
                            <label class="block font-bold text-[#343C6A] mb-1.5">Support Phone Helpline</label>
                            <input
                                type="text"
                                name="support_phone"
                                value="{{ $platformSettings['support_phone'] }}"
                                class="w-full px-4 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#DFEAF2] text-[#343C6A] font-bold outline-none focus:border-[#2D60FF]"
                            />
                        </div>

                        <div>
                            <label class="block font-bold text-[#343C6A] mb-1.5">Official Support Email</label>
                            <input
                                type="email"
                                name="support_email"
                                value="{{ $platformSettings['support_email'] }}"
                                class="w-full px-4 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#DFEAF2] text-[#343C6A] font-bold outline-none focus:border-[#2D60FF]"
                            />
                        </div>

                        <input type="hidden" name="require_kyc_for_booking" value="1" />
                        <input type="hidden" name="max_advance_days" value="30" />

                        <div class="pt-4 border-t border-[#F3F4F6]">
                            <button type="submit" class="px-6 py-3 rounded-full bg-[#2D60FF] hover:bg-blue-700 text-white font-bold text-xs transition shadow-md shadow-blue-500/20">
                                Save Settings
                            </button>
                        </div>
                    </form>
                </div>
            </div>

        </main>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL: PROOF OF REMITTANCE PREVIEW & VERIFICATION        -->
    <!-- ======================================================== -->
    <div id="proof-modal" class="fixed inset-0 z-50 hidden bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bankdash-card max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-5">
            <div class="flex items-center justify-between border-b border-[#F3F4F6] pb-3">
                <div>
                    <h3 class="text-lg font-bold text-[#343C6A]">Remittance Verification</h3>
                    <p id="proof-modal-subtitle" class="text-xs text-[#718EBF]">Operator commission payment receipt</p>
                </div>
                <button onclick="closeProofModal()" class="text-[#718EBF] hover:text-[#343C6A] text-xl font-bold">&times;</button>
            </div>

            <div class="space-y-4">
                <!-- Receipt Image Preview -->
                <div class="rounded-2xl overflow-hidden border border-[#DFEAF2] bg-[#F5F7FA] max-h-80 flex items-center justify-center">
                    <img id="proof-modal-img" src="" class="w-full h-auto object-contain max-h-80" alt="Receipt Proof" />
                </div>

                <!-- Payment Details Card -->
                <div class="p-4 rounded-2xl bg-[#F8FAFC] border border-[#DFEAF2] space-y-2 text-xs">
                    <div class="flex justify-between">
                        <span class="text-[#718EBF]">Amount Due (10%):</span>
                        <span id="proof-modal-amount" class="font-bold text-[#2D60FF] text-sm">₱0.00</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-[#718EBF]">Payment Method:</span>
                        <span id="proof-modal-method" class="font-bold text-[#343C6A] uppercase">GCash</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-[#718EBF]">Reference / Txn #:</span>
                        <span id="proof-modal-ref" class="font-mono font-bold text-[#343C6A]">REF-123456</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-[#718EBF]">Billing Month:</span>
                        <span id="proof-modal-month" class="font-bold text-[#343C6A]">2026-10</span>
                    </div>
                </div>

                <!-- Verification Form -->
                <form id="proof-modal-form" method="POST" action="" class="space-y-3">
                    @csrf
                    <div>
                        <label class="block text-xs font-bold text-[#343C6A] mb-1">Admin Verification Notes (Optional)</label>
                        <input type="text" name="admin_notes" placeholder="e.g. Verified against official GCash business wallet" class="w-full px-4 py-2 rounded-xl bg-[#F5F7FA] border border-[#DFEAF2] text-xs outline-none focus:border-[#2D60FF]" />
                    </div>
                    <div class="flex items-center gap-3 pt-2">
                        <button type="submit" class="flex-1 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md shadow-emerald-500/20">
                            Confirm Payment & Unfreeze Operator
                        </button>
                    </div>
                </form>

                <!-- Rejection Trigger -->
                <form id="proof-reject-form" method="POST" action="" class="border-t border-[#F3F4F6] pt-3">
                    @csrf
                    <input type="hidden" name="rejection_reason" value="Payment receipt reference is unclear or transaction could not be located in bank ledger." />
                    <button type="submit" class="w-full py-2.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition">
                        Reject Remittance Proof
                    </button>
                </form>
            </div>
        </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL: REJECT OPERATOR APPLICATION                        -->
    <!-- ======================================================== -->
    <div id="reject-modal" class="fixed inset-0 z-50 hidden bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bankdash-card max-w-md w-full space-y-4">
            <div class="flex items-center justify-between border-b border-[#F3F4F6] pb-3">
                <h3 class="text-base font-bold text-[#343C6A]">Reject Application</h3>
                <button onclick="closeRejectModal()" class="text-[#718EBF] hover:text-[#343C6A] text-xl font-bold">&times;</button>
            </div>
            <form id="reject-form" method="POST" action="" class="space-y-4 text-xs">
                @csrf
                <div>
                    <label class="block font-bold text-[#343C6A] mb-1.5">Specify Reason for Rejection</label>
                    <textarea
                        name="rejection_reason"
                        rows="3"
                        required
                        placeholder="e.g. Expired Mayor's permit, blurred DTI certificate..."
                        class="w-full px-4 py-2.5 rounded-xl bg-[#F5F7FA] border border-[#DFEAF2] text-[#343C6A] outline-none focus:border-[#2D60FF]"
                    ></textarea>
                </div>
                <div class="flex items-center justify-end gap-3 pt-2">
                    <button type="button" onclick="closeRejectModal()" class="px-4 py-2 rounded-full text-[#718EBF] hover:bg-[#F5F7FA]">Cancel</button>
                    <button type="submit" class="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold transition">Confirm Rejection</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ======================================================== -->
    <!-- SCRIPTS (BankDash Tab Controller & Chart Initializers)    -->
    <!-- ======================================================== -->
    <script>
        function closeSidebar() {
            document.getElementById('admin-sidebar').classList.add('-translate-x-full');
            document.getElementById('sidebar-overlay').classList.add('hidden');
            document.getElementById('sidebar-toggle').setAttribute('aria-expanded', 'false');
        }
        function toggleSidebar() {
            const sidebar = document.getElementById('admin-sidebar');
            const isOpen = !sidebar.classList.toggle('-translate-x-full');
            document.getElementById('sidebar-overlay').classList.toggle('hidden', !isOpen);
            document.getElementById('sidebar-toggle').setAttribute('aria-expanded', String(isOpen));
        }
        document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeSidebar(); closeProofModal(); closeRejectModal(); } });

        function switchTab(tabId) {
            if (!document.getElementById('tab-' + tabId)) tabId = 'dashboard';
            closeSidebar();
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));

            // Show selected tab
            const target = document.getElementById('tab-' + tabId);
            if (target) {
                target.classList.remove('hidden');
            }

            // Update top bar title
            const titles = {
                'dashboard': 'Overview',
                'commissions': 'Commissions & Remittance',
                'moderation': 'Operator Accreditation',
                'users': 'Members Directory',
                'disputes': 'Disputes & Incident Desk',
                'reviews': 'Review Moderation',
                'audit': 'Audit Trail',
                'settings': 'Platform Settings'
            };
            document.getElementById('page-title').innerText = titles[tabId] || 'Overview';

            // Update sidebar link styles
            document.querySelectorAll('#admin-sidebar nav button').forEach(btn => {
                btn.removeAttribute('aria-current');
                btn.className = 'sidebar-link-inactive flex w-full items-center justify-between px-8 py-3.5 text-left cursor-pointer transition';
            });
            const activeNav = document.getElementById('nav-' + tabId);
            if (activeNav) {
                activeNav.setAttribute('aria-current', 'page');
                activeNav.className = 'sidebar-link-active flex w-full items-center justify-between px-8 py-3.5 text-left cursor-pointer transition';
            }

            // Sync URL hash
            history.replaceState(null, null, '#' + tabId);
        }

        // Handle initial hash routing
        window.addEventListener('DOMContentLoaded', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const tabParam = urlParams.get('tab');
            const hash = window.location.hash.replace('#', '');
            const initialTab = tabParam || hash || 'dashboard';
            switchTab(initialTab);

            initCharts();
        });

        // Initialize BankDash Charts with Chart.js
        function initCharts() {
            if (typeof Chart === 'undefined') return;
            Chart.defaults.font.family = 'Plus Jakarta Sans';
            Chart.defaults.color = '#66757C';
            // 1. Weekly Activity Dual Bar Chart
            const weeklyCtx = document.getElementById('weeklyActivityChart')?.getContext('2d');
            if (weeklyCtx) {
                const activityData = @json($weeklyActivity);
                new Chart(weeklyCtx, {
                    type: 'bar',
                    data: {
                        labels: activityData.map(d => d.day_label),
                        datasets: [
                            {
                                label: '10% Commission (₱)',
                                yAxisID: 'y',
                                data: activityData.map(d => d.commission),
                                backgroundColor: '#E4B744',
                                borderRadius: 12,
                                barThickness: 14,
                            },
                            {
                                label: 'Completed Trips',
                                data: activityData.map(d => d.trips),
                                yAxisID: 'trips',
                                backgroundColor: '#2C6250',
                                borderRadius: 12,
                                barThickness: 14,
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        if (context.datasetIndex === 0) {
                                            return ' Commission: ₱' + context.parsed.y.toLocaleString();
                                        } else {
                                            return ' Trips: ' + context.parsed.y;
                                        }
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: { color: '#718EBF', font: { weight: '600' } }
                            },
                            trips: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { precision: 0 }, title: { display: true, text: 'Trips' } },
                            y: {
                                beginAtZero: true, title: { display: true, text: 'Commission (₱)' },
                                grid: { color: '#F3F4F6' },
                                ticks: { color: '#718EBF' },
                                border: { dash: [5, 5] }
                            }
                        }
                    }
                });
            }

            // 2. Expense Statistics Donut / Pie Chart
            const pieCtx = document.getElementById('fleetPieChart')?.getContext('2d');
            if (pieCtx) {
                const fleetData = @json($fleetDistribution);
                new Chart(pieCtx, {
                    type: 'doughnut',
                    data: {
                        labels: fleetData.map(f => f.name),
                        datasets: [{
                            data: fleetData.map(f => f.percent),
                            backgroundColor: fleetData.map((f, index) => ['#2C6250', '#F5C344', '#8BA99A', '#B88A68', '#8593A4'][index % 5]),
                            borderWidth: 2,
                            borderColor: '#FFFFFF'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    boxWidth: 10,
                                    font: { size: 10, weight: 'bold' },
                                    color: '#343C6A'
                                }
                            }
                        },
                        cutout: '72%'
                    }
                });
            }

            // 3. Balance History Smooth Area Spline Chart
            const balanceCtx = document.getElementById('balanceHistoryChart')?.getContext('2d');
            if (balanceCtx) {
                const historyData = @json($revenueHistory);
                const gradient = balanceCtx.createLinearGradient(0, 0, 0, 220);
                gradient.addColorStop(0, 'rgba(44, 98, 80, 0.25)');
                gradient.addColorStop(1, 'rgba(44, 98, 80, 0.0)');

                new Chart(balanceCtx, {
                    type: 'line',
                    data: {
                        labels: historyData.map(h => h.month_label),
                        datasets: [{
                            label: 'Commission (₱)',
                            data: historyData.map(h => h.commission),
                            borderColor: '#2C6250',
                            borderWidth: 3,
                            fill: true,
                            backgroundColor: gradient,
                            tension: 0.45,
                            pointRadius: 0,
                            pointHoverRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return ' ₱' + context.parsed.y.toLocaleString();
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: { color: '#718EBF', font: { weight: '600' } }
                            },
                            y: {
                                grid: { color: '#DFEAF2', borderDash: [4, 4] },
                                ticks: { color: '#718EBF' }
                            }
                        }
                    }
                });
            }
        }

        // Proof Modal Logic
        function openProofModal(id, imgUrl, method, ref, amount, month, operatorName, status) {
            document.getElementById('proof-modal-img').src = imgUrl;
            document.getElementById('proof-modal-amount').innerText = '₱' + amount;
            document.getElementById('proof-modal-method').innerText = method || 'GCash';
            document.getElementById('proof-modal-ref').innerText = ref || 'N/A';
            document.getElementById('proof-modal-month').innerText = month;
            document.getElementById('proof-modal-subtitle').innerText = 'Payment proof submitted by ' + operatorName;

            document.getElementById('proof-modal-form').action = '/admin/remittances/' + id + '/verify';
            document.getElementById('proof-reject-form').action = '/admin/remittances/' + id + '/reject';

            document.getElementById('proof-modal').classList.remove('hidden');
        }

        function closeProofModal() {
            document.getElementById('proof-modal').classList.add('hidden');
        }

        // Operator Rejection Modal
        function openRejectModal(userId, businessName) {
            document.getElementById('reject-form').action = '/admin/operators/' + userId + '/reject';
            document.getElementById('reject-modal').classList.remove('hidden');
        }

        function closeRejectModal() {
            document.getElementById('reject-modal').classList.add('hidden');
        }

        function selectQuickOperator(opId, name) {
            switchTab('commissions');
        }
    </script>
</body>
</html>
