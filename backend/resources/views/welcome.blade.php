<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="scroll-smooth">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Ride4Rent — Modern Vehicle Sharing & Rental Marketplace in Mindoro</title>
    <meta name="description" content="Mindoro's premier vehicle sharing marketplace. Rent verified cars, vans, SUVs and scooters directly from local hosts. 50% reservation deposit, 50% at pickup, digital handover inspections, and 24/7 AI travel support.">
    <link rel="icon" type="image/png" href="{{ asset('images/ride4rent.png') }}">

    <!-- Google Fonts: Plus Jakarta Sans & Outfit -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">

    <!-- FontAwesome 6 -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
                        display: ['"Outfit"', 'sans-serif'],
                        mono: ['"JetBrains Mono"', 'monospace'],
                    },
                    colors: {
                        brand: {
                            50: '#fefce8',
                            100: '#fef9c3',
                            200: '#fef08a',
                            300: '#fde047',
                            400: '#facc15',
                            500: '#eab308',
                            600: '#ca8a04',
                            700: '#a16207',
                            accent: '#f59e0b',
                            cyan: '#06b6d4',
                            emerald: '#10b981',
                            dark: '#080c16',
                            card: '#0f172a',
                            cardsoft: '#131d33',
                            border: '#1e293b'
                        }
                    },
                    animation: {
                        'float-slow': 'floatSlow 6s ease-in-out infinite',
                        'float-delayed': 'floatDelayed 7s ease-in-out infinite',
                        'pulse-glow': 'pulseGlow 5s ease-in-out infinite',
                        'marquee': 'marquee 28s linear infinite',
                    },
                    keyframes: {
                        floatSlow: {
                            '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                            '50%': { transform: 'translateY(-12px) rotate(1deg)' },
                        },
                        floatDelayed: {
                            '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                            '50%': { transform: 'translateY(-14px) rotate(-1deg)' },
                        },
                        pulseGlow: {
                            '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
                            '50%': { opacity: '0.7', transform: 'scale(1.08)' },
                        },
                        marquee: {
                            '0%': { transform: 'translateX(0%)' },
                            '100%': { transform: 'translateX(-50%)' }
                        }
                    }
                }
            }
        }
    </script>

    <style>
        /* Ambient Cyber Grid & Glow */
        .bg-cyber-grid {
            background-image: 
                linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
            background-size: 40px 40px;
        }

        .glass-pill {
            background: rgba(15, 23, 42, 0.75);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .glass-panel {
            background: linear-gradient(135deg, rgba(19, 29, 51, 0.7) 0%, rgba(10, 15, 27, 0.85) 100%);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.07);
        }

        .glass-panel:hover {
            border-color: rgba(245, 158, 11, 0.35);
            box-shadow: 0 20px 45px -15px rgba(0, 0, 0, 0.8), 0 0 30px -5px rgba(245, 158, 11, 0.12);
        }

        .glow-amber {
            box-shadow: 0 0 35px -5px rgba(245, 158, 11, 0.45);
        }

        .glow-cyan {
            box-shadow: 0 0 35px -5px rgba(6, 182, 212, 0.35);
        }

        .device-bezel {
            border-radius: 46px;
            box-shadow: 
                0 0 0 10px #1e293b,
                0 0 0 12px rgba(255, 255, 255, 0.12),
                0 30px 60px -12px rgba(0, 0, 0, 0.9);
        }

        /* Perspective 3D showcase */
        .stage-3d {
            perspective: 1200px;
        }

        /* Hide scrollbars for ticker */
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
    </style>
</head>
<body class="bg-brand-dark text-slate-100 font-sans antialiased selection:bg-brand-500 selection:text-slate-900 bg-cyber-grid overflow-x-hidden min-h-screen">

    <!-- Ambient Gradient Blobs in Background -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[750px] h-[450px] bg-gradient-to-r from-brand-500/15 via-amber-500/10 to-cyan-500/15 blur-[140px] rounded-full animate-pulse-glow"></div>
        <div class="absolute top-[35%] -left-32 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full"></div>
        <div class="absolute top-[65%] -right-32 w-[550px] h-[550px] bg-emerald-500/10 blur-[160px] rounded-full"></div>
    </div>

    <!-- =========================================================================
         1. FLOATING NAVIGATION BAR (DYNAMIC ISLAND STYLE)
    ========================================================================== -->
    <header class="fixed top-4 inset-x-0 z-50 px-4 sm:px-6 max-w-7xl mx-auto">
        <nav class="glass-pill rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xl transition-all duration-300">
            
            <!-- Brand Logo -->
            <a href="/" class="flex items-center gap-3 group">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 via-amber-400 to-amber-200 flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform">
                    <i class="fa-solid fa-car-rear text-slate-950 text-lg"></i>
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="font-display font-extrabold text-xl tracking-tight text-white group-hover:text-brand-400 transition-colors">Ride<span class="text-brand-500">4</span>Rent</span>
                        <span class="hidden md:inline-flex text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30">Mindoro</span>
                    </div>
                    <p class="text-[10px] text-slate-400 font-medium tracking-wide">Direct Vehicle Marketplace</p>
                </div>
            </a>

            <!-- Navigation Links -->
            <div class="hidden lg:flex items-center gap-7">
                <a href="#how-it-works" class="text-xs font-semibold text-slate-300 hover:text-brand-400 transition-colors uppercase tracking-wider">How It Works</a>
                <a href="#pricing-logic" class="text-xs font-semibold text-slate-300 hover:text-brand-400 transition-colors uppercase tracking-wider flex items-center gap-1.5">
                    <span>50% Booking Rule</span>
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                </a>
                <a href="#app-tour" class="text-xs font-semibold text-slate-300 hover:text-brand-400 transition-colors uppercase tracking-wider">App Tour</a>
                <a href="#fleet" class="text-xs font-semibold text-slate-300 hover:text-brand-400 transition-colors uppercase tracking-wider">Available Fleet</a>
                <a href="#host-calculator" class="text-xs font-semibold text-slate-300 hover:text-brand-400 transition-colors uppercase tracking-wider">Host Earnings</a>
                <a href="#faq" class="text-xs font-semibold text-slate-300 hover:text-brand-400 transition-colors uppercase tracking-wider">FAQ</a>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2.5">
                <a href="{{ route('admin.login') }}" class="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 transition-all">
                    <i class="fa-solid fa-lock text-brand-400 text-xs"></i>
                    <span>Admin</span>
                </a>

                <button onclick="openModal('downloadModal')" class="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-brand-400 via-brand-500 to-amber-500 text-slate-950 glow-amber hover:brightness-110 active:scale-95 transition-all">
                    <i class="fa-brands fa-android text-base"></i>
                    <span>Get APK</span>
                </button>

                <!-- Mobile Menu Toggle Button -->
                <button onclick="toggleMobileDrawer()" class="lg:hidden w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-300 flex items-center justify-center text-sm focus:outline-none">
                    <i id="menuIcon" class="fa-solid fa-bars"></i>
                </button>
            </div>

        </nav>

        <!-- Mobile Drawer Menu -->
        <div id="mobileDrawer" class="hidden lg:hidden mt-2 glass-pill rounded-2xl p-5 space-y-3.5 border border-slate-800/90 shadow-2xl backdrop-blur-2xl">
            <a href="#how-it-works" onclick="toggleMobileDrawer()" class="block text-sm font-semibold text-slate-200 hover:text-brand-400 py-1">How It Works</a>
            <a href="#pricing-logic" onclick="toggleMobileDrawer()" class="block text-sm font-semibold text-slate-200 hover:text-brand-400 py-1 flex items-center justify-between">
                <span>50% Fair Booking Protocol</span>
                <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">Fair Rates</span>
            </a>
            <a href="#app-tour" onclick="toggleMobileDrawer()" class="block text-sm font-semibold text-slate-200 hover:text-brand-400 py-1">Inside The App (Screenshots)</a>
            <a href="#fleet" onclick="toggleMobileDrawer()" class="block text-sm font-semibold text-slate-200 hover:text-brand-400 py-1">Featured Vehicles</a>
            <a href="#host-calculator" onclick="toggleMobileDrawer()" class="block text-sm font-semibold text-slate-200 hover:text-brand-400 py-1">Host Income Calculator</a>
            <a href="#faq" onclick="toggleMobileDrawer()" class="block text-sm font-semibold text-slate-200 hover:text-brand-400 py-1">FAQ & Rental Rules</a>
            <div class="pt-3 border-t border-slate-800 flex items-center justify-between">
                <a href="{{ route('admin.login') }}" class="text-xs text-brand-400 font-bold flex items-center gap-1.5">
                    <i class="fa-solid fa-shield-halved"></i> Admin Portal
                </a>
                <button onclick="openModal('downloadModal'); toggleMobileDrawer()" class="text-xs px-3.5 py-1.5 rounded-lg bg-brand-500 text-slate-950 font-bold">
                    Download Android APK
                </button>
            </div>
        </div>
    </header>

    <!-- Spacer for fixed navbar -->
    <div class="h-28"></div>

    <!-- =========================================================================
         2. HERO SECTION — EDITORIAL MOBILITY EXPERIENCE
    ========================================================================== -->
    <section class="relative pt-6 pb-20 lg:pt-12 lg:pb-28 overflow-hidden z-10">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                
                <!-- Left Column: Copy & Live Booking Estimator -->
                <div class="lg:col-span-7 text-center lg:text-left">
                    
                    <!-- Live Island Network Badge -->
                    <div class="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-semibold text-slate-200 mb-6 backdrop-blur-md">
                        <span class="flex h-2 w-2 relative">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span class="text-slate-200 font-medium">Oriental Mindoro Mobility Network</span>
                        <span class="text-slate-600">/</span>
                        <span class="text-brand-400 font-bold">Self-Drive & With Driver</span>
                    </div>

                    <!-- Main Headline -->
                    <h1 class="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-white leading-[1.1] mb-6">
                        Rent Directly from Verified Hosts. <span class="bg-gradient-to-r from-brand-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">Pay 50% to Lock, 50% at Pickup.</span>
                    </h1>

                    <!-- Subtitle -->
                    <p class="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed mb-8">
                        The smarter way to explore Puerto Galera, Calapan, and Mindoro's highways. Browse scooters, sedans, 4x4 SUVs, and family passenger vans. Complete digital handover inspections, track trips with live GPS, and get 24/7 bilingual AI guidance.
                    </p>

                    <!-- Interactive Live Trip Estimator Bar -->
                    <div class="glass-panel rounded-2xl p-4 sm:p-5 mb-8 text-left max-w-xl mx-auto lg:mx-0 shadow-2xl border border-brand-500/20">
                        <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                            <span class="flex items-center gap-1.5 text-brand-400">
                                <i class="fa-solid fa-calculator"></i>
                                <span>Instant Fee Calculator</span>
                            </span>
                            <span class="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">100% Transparent</span>
                        </div>

                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                            <!-- Vehicle Category Select -->
                            <div>
                                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Vehicle Type</label>
                                <select id="calcType" onchange="calculateEstimates()" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-brand-500">
                                    <option value="1500" selected>Sedan (₱1,500/d)</option>
                                    <option value="3200">SUV 4x4 (₱3,200/d)</option>
                                    <option value="4200">Family Van (₱4,200/d)</option>
                                    <option value="500">Scooter (₱500/d)</option>
                                </select>
                            </div>

                            <!-- Duration Select -->
                            <div>
                                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Duration</label>
                                <select id="calcDays" onchange="calculateEstimates()" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-brand-500">
                                    <option value="1">1 Day</option>
                                    <option value="3" selected>3 Days</option>
                                    <option value="5">5 Days</option>
                                    <option value="7">7 Days</option>
                                </select>
                            </div>

                            <!-- Location Select -->
                            <div class="col-span-2 sm:col-span-1">
                                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Pickup City</label>
                                <select class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-brand-500">
                                    <option>Calapan City</option>
                                    <option>Puerto Galera</option>
                                    <option>Roxas Port</option>
                                    <option>Pinamalayan</option>
                                </select>
                            </div>
                        </div>

                        <!-- Real-time calculation readout -->
                        <div class="bg-slate-950/80 rounded-xl p-3 border border-slate-800 grid grid-cols-3 gap-2 text-center">
                            <div>
                                <p class="text-[10px] text-slate-400 font-medium">Total Rental</p>
                                <p id="calcTotal" class="text-sm font-extrabold text-white font-mono">₱4,500.00</p>
                            </div>
                            <div class="border-x border-slate-800">
                                <p class="text-[10px] text-brand-400 font-bold">50% To Reserve</p>
                                <p id="calcReservation" class="text-sm font-extrabold text-brand-400 font-mono">₱225.00</p>
                            </div>
                            <div>
                                <p class="text-[10px] text-emerald-400 font-bold">50% At Handover</p>
                                <p id="calcPickup" class="text-sm font-extrabold text-emerald-400 font-mono">₱4,275.00</p>
                            </div>
                        </div>

                    </div>

                    <!-- Action Buttons -->
                    <div class="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-8">
                        <button onclick="openModal('downloadModal')" class="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 text-sm font-extrabold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-brand-400 via-brand-500 to-amber-500 hover:brightness-110 rounded-2xl glow-amber active:scale-95 transition-all">
                            <i class="fa-brands fa-android text-xl"></i>
                            <span>Download Android APK</span>
                        </button>

                        <button onclick="openModal('qrModal')" class="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-4 text-sm font-bold text-white bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-lg active:scale-95 transition-all">
                            <i class="fa-solid fa-qrcode text-brand-400 text-lg"></i>
                            <span>Scan QR to Install</span>
                        </button>
                    </div>

                    <!-- Trust indicators -->
                    <div class="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-400 font-semibold">
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-shield-check text-emerald-400 text-sm"></i>
                            <span>DTI & License Verified Hosts</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-camera-viewfinder text-brand-400 text-sm"></i>
                            <span>Digital Pre-Trip Handover</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-wallet text-cyan-400 text-sm"></i>
                            <span>Protected Deposit Release</span>
                        </div>
                    </div>

                </div>

                <!-- Right Column: Interactive Real Device Stage -->
                <div class="lg:col-span-5 flex flex-col items-center justify-center relative stage-3d">
                    
                    <!-- Ambient Backlight behind phones -->
                    <div class="absolute inset-0 bg-gradient-to-tr from-brand-500/20 via-cyan-500/10 to-amber-500/20 blur-3xl rounded-[60px] pointer-events-none"></div>

                    <!-- Screen Switcher Tabs -->
                    <div class="inline-flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-xl mb-6 z-30 shadow-2xl">
                        <button type="button" onclick="switchPhoneTab('screen1')" id="tabBtn1" class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all bg-brand-500 text-slate-950 shadow-md">
                            <i class="fa-solid fa-car-side"></i>
                            <span>1. Marketplace</span>
                        </button>
                        <button type="button" onclick="switchPhoneTab('screen2')" id="tabBtn2" class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-white transition-all">
                            <i class="fa-solid fa-robot text-emerald-400"></i>
                            <span>2. AI Assistant</span>
                        </button>
                        <button type="button" onclick="switchPhoneTab('both')" id="tabBtnBoth" class="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition-all">
                            <i class="fa-solid fa-layer-group"></i>
                            <span>Dual View</span>
                        </button>
                    </div>

                    <!-- Phone Frame Showcase Container -->
                    <div id="phoneStage" class="relative z-10 w-full max-w-[420px] h-[550px] sm:h-[610px] flex items-center justify-center">
                        
                        <!-- Screen 1 Phone Mockup (Marketplace) -->
                        <div id="mockupScreen1" class="absolute transition-all duration-700 ease-out z-20 cursor-pointer animate-float-slow transform scale-100" onclick="openImagePreview('{{ asset('images/screen1.png') }}', 'Ride4Rent Vehicle Marketplace')">
                            <div class="relative group">
                                <img src="{{ asset('images/screen1.png') }}" 
                                     alt="Ride4Rent Marketplace Screen" 
                                     class="w-[250px] sm:w-[280px] h-auto object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.9)] rounded-[38px] border-4 border-slate-800 group-hover:border-brand-500/60 transition-all">
                                
                                <!-- Floating Micro-tag on image -->
                                <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/90 border border-brand-500/50 backdrop-blur-md px-3.5 py-1 rounded-full shadow-2xl text-[11px] font-bold text-brand-400 flex items-center gap-1.5">
                                    <i class="fa-solid fa-magnifying-glass"></i>
                                    <span>Direct Host Marketplace</span>
                                </div>
                            </div>
                        </div>

                        <!-- Screen 2 Phone Mockup (AI Assistant) -->
                        <div id="mockupScreen2" class="absolute transition-all duration-700 ease-out z-10 cursor-pointer animate-float-delayed transform scale-90 translate-x-16 sm:translate-x-24 -translate-y-4 opacity-75 hover:opacity-100" onclick="openImagePreview('{{ asset('images/screen2.png') }}', '24/7 AI Rental Assistant')">
                            <div class="relative group">
                                <img src="{{ asset('images/screen2.png') }}" 
                                     alt="Ride4Rent AI Assistant Screen" 
                                     class="w-[250px] sm:w-[280px] h-auto object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.85)] rounded-[38px] border-4 border-slate-800 group-hover:border-emerald-500/60 transition-all">
                                
                                <!-- Floating Micro-tag on image -->
                                <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/90 border border-emerald-500/50 backdrop-blur-md px-3.5 py-1 rounded-full shadow-2xl text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                                    <i class="fa-solid fa-sparkles"></i>
                                    <span>24/7 Bilingual AI Concierge</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- Floating Feature Floating Chip Left -->
                    <div class="hidden sm:flex absolute -left-8 top-28 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3 shadow-2xl items-center gap-3 z-30">
                        <div class="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center text-sm font-bold">
                            50%
                        </div>
                        <div>
                            <p class="text-xs font-bold text-white">Deposit Only</p>
                            <p class="text-[10px] text-slate-400">Lock vehicle instantly</p>
                        </div>
                    </div>

                    <!-- Floating Feature Floating Chip Right -->
                    <div class="hidden sm:flex absolute -right-6 bottom-16 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3 shadow-2xl items-center gap-3 z-30">
                        <div class="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">
                            <i class="fa-solid fa-comment-dots"></i>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-white">Tagalog & English</p>
                            <p class="text-[10px] text-slate-400">AI Concierge in-app</p>
                        </div>
                    </div>

                </div>

            </div>

        </div>
    </section>

    <!-- =========================================================================
         3. MUNICIPALITIES TICKER (ORIENTAL MINDORO SERVICE REACH)
    ========================================================================== -->
    <div class="border-y border-slate-800/90 bg-slate-950/80 py-4 relative overflow-hidden">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            
            <div class="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                <i class="fa-solid fa-map-pin text-brand-400"></i>
                <span>Active Coverage Across Oriental Mindoro:</span>
            </div>

            <div class="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-semibold text-slate-300">
                <span class="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-brand-400 text-[10px]"></i> Calapan City</span>
                <span class="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-brand-400 text-[10px]"></i> Puerto Galera</span>
                <span class="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-brand-400 text-[10px]"></i> Roxas RORO Port</span>
                <span class="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-brand-400 text-[10px]"></i> Pinamalayan</span>
                <span class="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-brand-400 text-[10px]"></i> Victoria</span>
                <span class="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-brand-400 text-[10px]"></i> Naujan</span>
            </div>

        </div>
    </div>

    <!-- =========================================================================
         4. KEY STATS COUNTER BAR
    ========================================================================== -->
    <section class="py-12 bg-slate-900/40 border-b border-slate-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center divide-y sm:divide-y-0 lg:divide-x divide-slate-800/80">
                
                <div class="pt-3 sm:pt-0">
                    <p class="font-display font-extrabold text-3xl sm:text-4xl text-brand-400 font-mono mb-1">{{ $stats['vehicles_count'] }}+</p>
                    <p class="text-xs sm:text-sm font-bold text-slate-200">Inspected Vehicles</p>
                    <p class="text-[11px] text-slate-400">Cars, 4x4 SUVs, & Vans</p>
                </div>

                <div class="pt-3 sm:pt-0">
                    <p class="font-display font-extrabold text-3xl sm:text-4xl text-white font-mono mb-1">{{ $stats['operators_count'] }}+</p>
                    <p class="text-xs sm:text-sm font-bold text-slate-200">Verified Local Hosts</p>
                    <p class="text-[11px] text-slate-400">ID & Vehicle KYC Passed</p>
                </div>

                <div class="pt-3 sm:pt-0">
                    <p class="font-display font-extrabold text-3xl sm:text-4xl text-emerald-400 font-mono mb-1">{{ $stats['trips_completed'] }}+</p>
                    <p class="text-xs sm:text-sm font-bold text-slate-200">Safe Trips Completed</p>
                    <p class="text-[11px] text-slate-400">Across Mindoro Highways</p>
                </div>

                <div class="pt-3 sm:pt-0">
                    <p class="font-display font-extrabold text-3xl sm:text-4xl text-cyan-400 font-mono mb-1">{{ $stats['satisfaction_rate'] }}%</p>
                    <p class="text-xs sm:text-sm font-bold text-slate-200">5-Star Renter Rating</p>
                    <p class="text-[11px] text-slate-400">Zero Hidden Broker Fees</p>
                </div>

            </div>
        </div>
    </section>

    <!-- =========================================================================
         5. THE 50% FAIR BOOKING PROTOCOL (ADDRESSING REQUEST 9 LOGIC DIRECTLY)
    ========================================================================== -->
    <section id="pricing-logic" class="py-20 relative bg-slate-950/70 border-b border-slate-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div class="text-center max-w-3xl mx-auto mb-16">
                <span class="inline-flex items-center gap-1.5 text-xs uppercase font-extrabold tracking-widest text-brand-400 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-3">
                    <i class="fa-solid fa-scale-balanced"></i> Fair Math & Transparency
                </span>
                <h2 class="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                    Never Pay 100% Upfront. Pay the 50% Reservation Deposit Only.
                </h2>
                <p class="text-slate-400 text-sm sm:text-base mt-4 leading-relaxed">
                    Most vehicle brokers in the Philippines demand 100% bank transfer upfront with zero refund guarantee. Ride4Rent protects both renters and hosts with a balanced payment flow.
                </p>
            </div>

            <!-- 3-Step Payment Logic Pathway -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                
                <!-- Card 1: 50% Reservation -->
                <div class="glass-panel rounded-3xl p-7 relative border-t-4 border-t-brand-500">
                    <div class="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center text-xl font-bold mb-5 font-mono">
                        01
                    </div>
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="font-display font-bold text-xl text-white">50% Reservation Fee</h3>
                        <span class="text-xs font-mono px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 font-bold">Paid Upfront</span>
                    </div>
                    <p class="text-xs text-slate-300 leading-relaxed mb-5">
                        Pay via GCash, Maya, or Debit Card to lock your schedule. This secures your reservation with the host so they reserve the car solely for you.
                    </p>
                    <ul class="space-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                        <li class="flex items-center gap-2"><i class="fa-solid fa-check text-brand-400"></i> Instant automated receipt</li>
                        <li class="flex items-center gap-2"><i class="fa-solid fa-check text-brand-400"></i> Vehicle marked unavailable to others</li>
                        <li class="flex items-center gap-2"><i class="fa-solid fa-check text-brand-400"></i> Direct host chat unlocks</li>
                    </ul>
                </div>

                <!-- Card 2: 50% Remaining Balance -->
                <div class="glass-panel rounded-3xl p-7 relative border-t-4 border-t-emerald-500">
                    <div class="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xl font-bold mb-5 font-mono">
                        02
                    </div>
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="font-display font-bold text-xl text-white">50% Handover Balance</h3>
                        <span class="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">At Pickup</span>
                    </div>
                    <p class="text-xs text-slate-300 leading-relaxed mb-5">
                        Inspect the vehicle first! Only pay the 50% remaining balance directly to the operator once you verify the car and complete the pre-trip check.
                    </p>
                    <ul class="space-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                        <li class="flex items-center gap-2"><i class="fa-solid fa-check text-emerald-400"></i> Zero risk of ghosting hosts</li>
                        <li class="flex items-center gap-2"><i class="fa-solid fa-check text-emerald-400"></i> Digital inspection logged in-app</li>
                        <li class="flex items-center gap-2"><i class="fa-solid fa-check text-emerald-400"></i> Pay cash or e-wallet on the spot</li>
                    </ul>
                </div>

                <!-- Card 3: Exact Surcharges & Extensions -->
                <div class="glass-panel rounded-3xl p-7 relative border-t-4 border-t-cyan-500">
                    <div class="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-xl font-bold mb-5 font-mono">
                        03
                    </div>
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="font-display font-bold text-xl text-white">Transparent Returns</h3>
                        <span class="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">Post-Trip</span>
                    </div>
                    <p class="text-xs text-slate-300 leading-relaxed mb-5">
                        No surprise charges. Return with the same fuel level you received. If you request a trip extension, get exact approved rates right in your bottom sheet.
                    </p>
                    <ul class="space-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                        <li class="flex items-center gap-2"><i class="fa-solid fa-check text-cyan-400"></i> Same-to-same fuel policy</li>
                        <li class="flex items-center gap-2"><i class="fa-solid fa-check text-cyan-400"></i> Instant security deposit release</li>
                        <li class="flex items-center gap-2"><i class="fa-solid fa-check text-cyan-400"></i> Exact breakdown in Rental Details</li>
                    </ul>
                </div>

            </div>

        </div>
    </section>

    <!-- =========================================================================
         6. APP TOUR DEEP DIVE (SHOWCASING SCREEN1 & SCREEN2 IN DETAIL)
    ========================================================================== -->
    <section id="app-tour" class="py-24 relative bg-brand-dark overflow-hidden">
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            
            <div class="text-center max-w-3xl mx-auto mb-16">
                <span class="inline-flex items-center gap-1.5 text-xs uppercase font-extrabold tracking-widest text-cyan-400 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-3">
                    <i class="fa-solid fa-mobile-screen"></i> Real Native Application
                </span>
                <h2 class="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                    Designed for Travelers. Powered by Real-Time Telemetry.
                </h2>
                <p class="text-slate-400 text-sm sm:text-base mt-4 leading-relaxed">
                    Check out live screenshots from the Android app. Smooth animations, instant filters, and intelligent assistance.
                </p>
            </div>

            <!-- 2-Column Split: Screen 1 (Marketplace) & Screen 2 (AI Assistant) -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
                
                <!-- Showcase Card 1: Explore & Marketplace -->
                <div class="glass-panel rounded-3xl p-8 sm:p-10 flex flex-col justify-between group hover:border-brand-500/40 transition-all">
                    <div>
                        <div class="flex items-center justify-between mb-6">
                            <span class="text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30 flex items-center gap-1.5">
                                <i class="fa-solid fa-car"></i> Discovery Engine
                            </span>
                            <span class="text-xs font-mono text-slate-500">Screen 01</span>
                        </div>

                        <h3 class="font-display font-extrabold text-2xl text-white mb-3">
                            Explore Vehicles with Instant Filters
                        </h3>
                        <p class="text-sm text-slate-300 leading-relaxed mb-6">
                            Find exactly what fits your Mindoro journey. Filter by transmission type (Automatic or Manual), fuel efficiency (Gasoline vs. Diesel), seat capacity, and pickup location.
                        </p>

                        <!-- Highlights List -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-xs text-slate-300">
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-circle-check text-brand-400"></i>
                                <span>High-demand badge alerts</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-circle-check text-brand-400"></i>
                                <span>20% OFF first-booking vouchers</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-circle-check text-brand-400"></i>
                                <span>Transparent ₱/day pricing</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-circle-check text-brand-400"></i>
                                <span>Favorite car wishlisting</span>
                            </div>
                        </div>
                    </div>

                    <!-- Screenshot Container with Click to Zoom -->
                    <div class="flex justify-center pt-2">
                        <div class="relative cursor-pointer group-hover:scale-105 transition-transform duration-500" onclick="openImagePreview('{{ asset('images/screen1.png') }}', 'Vehicle Marketplace View')">
                            <img src="{{ asset('images/screen1.png') }}" 
                                 alt="Ride4Rent Marketplace" 
                                 class="w-[230px] sm:w-[260px] h-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)] rounded-[32px] border-2 border-slate-700/80">
                            <div class="absolute inset-0 bg-brand-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[32px] flex items-center justify-center">
                                <span class="bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-full border border-brand-500 font-bold shadow-xl">
                                    <i class="fa-solid fa-magnifying-glass-plus mr-1"></i> Tap to View
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- Showcase Card 2: 24/7 AI Rental Assistant -->
                <div class="glass-panel rounded-3xl p-8 sm:p-10 flex flex-col justify-between group hover:border-emerald-500/40 transition-all">
                    <div>
                        <div class="flex items-center justify-between mb-6">
                            <span class="text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                                <i class="fa-solid fa-robot"></i> Smart Concierge
                            </span>
                            <span class="text-xs font-mono text-slate-500">Screen 02</span>
                        </div>

                        <h3 class="font-display font-extrabold text-2xl text-white mb-3">
                            Bilingual 24/7 Travel & AI Support
                        </h3>
                        <p class="text-sm text-slate-300 leading-relaxed mb-6">
                            Have questions about Mindoro road conditions, ferry schedules at Batangas/Calapan/Roxas ports, or security deposits? Ask the integrated AI assistant in English or Tagalog.
                        </p>

                        <!-- Highlights List -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-xs text-slate-300">
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-circle-check text-emerald-400"></i>
                                <span>Tagalog & English fluency</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-circle-check text-emerald-400"></i>
                                <span>Interactive quick prompts</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-circle-check text-emerald-400"></i>
                                <span>Zero waiting time for answers</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-circle-check text-emerald-400"></i>
                                <span>Mindoro scenic route suggestions</span>
                            </div>
                        </div>
                    </div>

                    <!-- Screenshot Container with Click to Zoom -->
                    <div class="flex justify-center pt-2">
                        <div class="relative cursor-pointer group-hover:scale-105 transition-transform duration-500" onclick="openImagePreview('{{ asset('images/screen2.png') }}', '24/7 AI Concierge View')">
                            <img src="{{ asset('images/screen2.png') }}" 
                                 alt="Ride4Rent AI Assistant" 
                                 class="w-[230px] sm:w-[260px] h-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)] rounded-[32px] border-2 border-slate-700/80">
                            <div class="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[32px] flex items-center justify-center">
                                <span class="bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-full border border-emerald-500 font-bold shadow-xl">
                                    <i class="fa-solid fa-magnifying-glass-plus mr-1"></i> Tap to View
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

        </div>
    </section>

    <!-- =========================================================================
         7. HOW IT WORKS (THE 4-STEP RENTER PLAYBOOK)
    ========================================================================== -->
    <section id="how-it-works" class="py-20 relative bg-slate-950/70 border-b border-slate-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div class="text-center max-w-3xl mx-auto mb-16">
                <span class="inline-flex items-center gap-1.5 text-xs uppercase font-extrabold tracking-widest text-brand-400 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-3">
                    <i class="fa-solid fa-route"></i> Seamless Journey
                </span>
                <h2 class="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                    From App Download to Open Road in 4 Steps
                </h2>
                <p class="text-slate-400 text-sm sm:text-base mt-4 leading-relaxed">
                    Designed for zero friction. Book, verify, inspect, and drive without ever dealing with middleman brokers.
                </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <!-- Step 1 -->
                <div class="glass-panel rounded-2xl p-6 relative group">
                    <div class="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 font-mono font-bold flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        1
                    </div>
                    <h3 class="font-display font-bold text-lg text-white mb-2">Select Your Ride</h3>
                    <p class="text-xs text-slate-300 leading-relaxed">
                        Pick your vehicle in Calapan, Puerto Galera, or Roxas. Select Self-Drive or With Driver options based on your itinerary.
                    </p>
                </div>

                <!-- Step 2 -->
                <div class="glass-panel rounded-2xl p-6 relative group">
                    <div class="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 font-mono font-bold flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        2
                    </div>
                    <h3 class="font-display font-bold text-lg text-white mb-2">50% Reservation Lock</h3>
                    <p class="text-xs text-slate-300 leading-relaxed">
                        Submit driver's license KYC and pay only 50% of the total rent to block the vehicle dates. The host gets notified immediately.
                    </p>
                </div>

                <!-- Step 3 -->
                <div class="glass-panel rounded-2xl p-6 relative group">
                    <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        3
                    </div>
                    <h3 class="font-display font-bold text-lg text-white mb-2">Digital Handover</h3>
                    <p class="text-xs text-slate-300 leading-relaxed">
                        Meet the host at your pickup spot. Take 4 photo angles, log initial odometer and fuel level in the app, and pay the 50% balance.
                    </p>
                </div>

                <!-- Step 4 -->
                <div class="glass-panel rounded-2xl p-6 relative group">
                    <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-mono font-bold flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        4
                    </div>
                    <h3 class="font-display font-bold text-lg text-white mb-2">Enjoy Mindoro</h3>
                    <p class="text-xs text-slate-300 leading-relaxed">
                        Drive with peace of mind. Live GPS telemetry, roadside assistance contact, and instant return checkout when your trip ends.
                    </p>
                </div>

            </div>

        </div>
    </section>

    <!-- =========================================================================
         8. COMPARISON MATRIX (TRADITIONAL BROKERS VS. RIDE4RENT)
    ========================================================================== -->
    <section class="py-20 relative bg-brand-dark border-b border-slate-800">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div class="text-center max-w-2xl mx-auto mb-14">
                <span class="inline-flex items-center gap-1.5 text-xs uppercase font-extrabold tracking-widest text-brand-400 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-3">
                    <i class="fa-solid fa-code-compare"></i> The Modern Alternative
                </span>
                <h2 class="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                    Why Travelers Switch to Ride4Rent
                </h2>
                <p class="text-slate-400 text-xs sm:text-sm mt-3">
                    A clear comparison between unverified social media car rentals and our audited platform.
                </p>
            </div>

            <div class="glass-panel rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                            <tr class="border-b border-slate-800 bg-slate-900/80">
                                <th class="p-4 sm:p-5 font-bold text-slate-300">Features & Protections</th>
                                <th class="p-4 sm:p-5 font-bold text-slate-400">Traditional Facebook Brokers</th>
                                <th class="p-4 sm:p-5 font-bold text-brand-400 bg-brand-500/10">Ride4Rent Mobile App</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/80">
                            <tr>
                                <td class="p-4 sm:p-5 font-medium text-white">Upfront Payment Requirement</td>
                                <td class="p-4 sm:p-5 text-rose-400 font-semibold"><i class="fa-solid fa-xmark mr-1.5"></i> 100% upfront wire transfer</td>
                                <td class="p-4 sm:p-5 text-emerald-400 font-bold bg-brand-500/5"><i class="fa-solid fa-check mr-1.5"></i> Only 50% reservation fee</td>
                            </tr>
                            <tr>
                                <td class="p-4 sm:p-5 font-medium text-white">Pre-Trip Damage Proof</td>
                                <td class="p-4 sm:p-5 text-rose-400 font-semibold"><i class="fa-solid fa-xmark mr-1.5"></i> None / Hand-written paper slips</td>
                                <td class="p-4 sm:p-5 text-emerald-400 font-bold bg-brand-500/5"><i class="fa-solid fa-check mr-1.5"></i> 360° In-App photo inspection</td>
                            </tr>
                            <tr>
                                <td class="p-4 sm:p-5 font-medium text-white">Host & Vehicle KYC</td>
                                <td class="p-4 sm:p-5 text-rose-400 font-semibold"><i class="fa-solid fa-xmark mr-1.5"></i> Unverified private sellers</td>
                                <td class="p-4 sm:p-5 text-emerald-400 font-bold bg-brand-500/5"><i class="fa-solid fa-check mr-1.5"></i> DTI, LTO & ID verification</td>
                            </tr>
                            <tr>
                                <td class="p-4 sm:p-5 font-medium text-white">Trip Extensions & Late Math</td>
                                <td class="p-4 sm:p-5 text-rose-400 font-semibold"><i class="fa-solid fa-xmark mr-1.5"></i> Arbitrary exorbitant penalties</td>
                                <td class="p-4 sm:p-5 text-emerald-400 font-bold bg-brand-500/5"><i class="fa-solid fa-check mr-1.5"></i> Exact automated formulas in-app</td>
                            </tr>
                            <tr>
                                <td class="p-4 sm:p-5 font-medium text-white">24/7 Road & Route Support</td>
                                <td class="p-4 sm:p-5 text-rose-400 font-semibold"><i class="fa-solid fa-xmark mr-1.5"></i> Slow / Unresponsive messaging</td>
                                <td class="p-4 sm:p-5 text-emerald-400 font-bold bg-brand-500/5"><i class="fa-solid fa-check mr-1.5"></i> 24/7 Bilingual AI Concierge</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </section>

    <!-- =========================================================================
         9. LIVE DATABASE FLEET SHOWCASE
    ========================================================================== -->
    <section id="fleet" class="py-20 relative bg-slate-950/70 border-b border-slate-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <span class="inline-flex items-center gap-1.5 text-xs uppercase font-extrabold tracking-widest text-brand-400 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-3">
                        <i class="fa-solid fa-car-burst"></i> Verified Vehicles
                    </span>
                    <h2 class="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                        Featured Vehicles in Oriental Mindoro
                    </h2>
                    <p class="text-slate-400 text-sm mt-2">
                        Real available inventory listed by certified operators. Ready for immediate booking on the app.
                    </p>
                </div>

                <button onclick="openModal('downloadModal')" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 hover:border-brand-500 text-white transition-all self-start md:self-auto">
                    <span>View All in Android App</span>
                    <i class="fa-solid fa-arrow-right text-brand-400"></i>
                </button>
            </div>

            <!-- Vehicles Grid (With Database Content & Graceful Fallback) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
                
                @forelse($featuredVehicles as $vehicle)
                    <div class="glass-panel rounded-3xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                        <div>
                            <!-- Vehicle Image Banner -->
                            <div class="relative h-48 bg-slate-900 overflow-hidden flex items-center justify-center">
                                @if($vehicle->images && $vehicle->images->count() > 0)
                                    <img src="{{ $vehicle->images->first()->image_url }}" alt="{{ $vehicle->model_name }}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                                @else
                                    <div class="flex flex-col items-center justify-center text-slate-600">
                                        <i class="fa-solid fa-car-side text-4xl mb-2 text-brand-500/40"></i>
                                        <span class="text-[11px] font-semibold text-slate-500">Verified Unit</span>
                                    </div>
                                @endif

                                <!-- Category Badge -->
                                <div class="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700 text-[10px] font-extrabold uppercase text-white">
                                    {{ $vehicle->vehicleType->name ?? 'Vehicle' }}
                                </div>

                                <!-- Self-Drive or With Driver -->
                                <div class="absolute top-3 right-3 bg-brand-500/90 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase">
                                    {{ ucfirst(str_replace('_', ' ', $vehicle->rental_type ?? 'Self-Drive')) }}
                                </div>
                            </div>

                            <!-- Vehicle Details -->
                            <div class="p-6">
                                <div class="flex items-center justify-between mb-1.5">
                                    <p class="text-xs font-bold text-brand-400 uppercase tracking-wider">{{ $vehicle->brand->name ?? 'Ride4Rent' }}</p>
                                    <div class="flex items-center gap-1 text-xs text-amber-400 font-bold">
                                        <i class="fa-solid fa-star text-[10px]"></i>
                                        <span>{{ number_format($vehicle->rating ?? 5.0, 1) }}</span>
                                    </div>
                                </div>

                                <h3 class="font-display font-bold text-xl text-white mb-4">{{ $vehicle->model_name }}</h3>

                                <!-- Specs row -->
                                <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-300 mb-6 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                                    <div class="flex items-center gap-1.5">
                                        <i class="fa-solid fa-gears text-brand-400"></i>
                                        <span>{{ $vehicle->transmissionType->name ?? 'Auto' }}</span>
                                    </div>
                                    <div class="flex items-center gap-1.5">
                                        <i class="fa-solid fa-gas-pump text-emerald-400"></i>
                                        <span>{{ $vehicle->fuelType->name ?? 'Gasoline' }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Price & Action Footer -->
                        <div class="px-6 pb-6 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                            <div>
                                <p class="text-[10px] text-slate-400 font-medium">Daily Rental</p>
                                <p class="text-lg font-black text-white font-mono">₱{{ number_format($vehicle->daily_rate, 2) }}</p>
                                <p class="text-[10px] text-brand-400 font-bold">50% Deposit: ₱{{ number_format($vehicle->daily_rate * 0.50, 2) }}</p>
                            </div>

                            <button onclick="openModal('downloadModal')" class="px-4 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-400 text-slate-950 transition-colors">
                                Book on App
                            </button>
                        </div>
                    </div>
                @empty
                    <!-- Fallback Sample Fleet Cards for clean look if DB has no available records -->
                    <div class="glass-panel rounded-3xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                        <div>
                            <div class="relative h-48 bg-slate-900 flex items-center justify-center">
                                <i class="fa-solid fa-truck-pickup text-5xl text-brand-500/50"></i>
                                <span class="absolute top-3 left-3 bg-slate-950/80 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase text-white">SUV 4x4</span>
                                <span class="absolute top-3 right-3 bg-brand-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase">Self-Drive</span>
                            </div>
                            <div class="p-6">
                                <p class="text-xs font-bold text-brand-400 uppercase tracking-wider">Toyota</p>
                                <h3 class="font-display font-bold text-xl text-white mb-4">Fortuner 2.8L 4x4</h3>
                                <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-300 mb-6 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                                    <span><i class="fa-solid fa-gears text-brand-400 mr-1"></i> Automatic</span>
                                    <span><i class="fa-solid fa-gas-pump text-emerald-400 mr-1"></i> Diesel</span>
                                </div>
                            </div>
                        </div>
                        <div class="px-6 pb-6 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                            <div>
                                <p class="text-lg font-black text-white font-mono">₱3,500.00 <span class="text-xs font-normal text-slate-400">/day</span></p>
                                <p class="text-[10px] text-brand-400 font-bold">50% Deposit: ₱175.00</p>
                            </div>
                            <button onclick="openModal('downloadModal')" class="px-4 py-2 rounded-xl text-xs font-bold bg-brand-500 text-slate-950">Book on App</button>
                        </div>
                    </div>

                    <div class="glass-panel rounded-3xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                        <div>
                            <div class="relative h-48 bg-slate-900 flex items-center justify-center">
                                <i class="fa-solid fa-van-shuttle text-5xl text-cyan-500/50"></i>
                                <span class="absolute top-3 left-3 bg-slate-950/80 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase text-white">Passenger Van</span>
                                <span class="absolute top-3 right-3 bg-cyan-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase">With Driver</span>
                            </div>
                            <div class="p-6">
                                <p class="text-xs font-bold text-cyan-400 uppercase tracking-wider">Toyota</p>
                                <h3 class="font-display font-bold text-xl text-white mb-4">HiAce Grandia 12-Seater</h3>
                                <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-300 mb-6 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                                    <span><i class="fa-solid fa-gears text-brand-400 mr-1"></i> Manual</span>
                                    <span><i class="fa-solid fa-gas-pump text-emerald-400 mr-1"></i> Diesel</span>
                                </div>
                            </div>
                        </div>
                        <div class="px-6 pb-6 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                            <div>
                                <p class="text-lg font-black text-white font-mono">₱4,200.00 <span class="text-xs font-normal text-slate-400">/day</span></p>
                                <p class="text-[10px] text-brand-400 font-bold">50% Deposit: ₱210.00</p>
                            </div>
                            <button onclick="openModal('downloadModal')" class="px-4 py-2 rounded-xl text-xs font-bold bg-brand-500 text-slate-950">Book on App</button>
                        </div>
                    </div>

                    <div class="glass-panel rounded-3xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                        <div>
                            <div class="relative h-48 bg-slate-900 flex items-center justify-center">
                                <i class="fa-solid fa-car-side text-5xl text-emerald-500/50"></i>
                                <span class="absolute top-3 left-3 bg-slate-950/80 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase text-white">Sedan</span>
                                <span class="absolute top-3 right-3 bg-brand-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase">Self-Drive</span>
                            </div>
                            <div class="p-6">
                                <p class="text-xs font-bold text-emerald-400 uppercase tracking-wider">Toyota</p>
                                <h3 class="font-display font-bold text-xl text-white mb-4">Vios Dual VVT-i</h3>
                                <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-300 mb-6 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                                    <span><i class="fa-solid fa-gears text-brand-400 mr-1"></i> Automatic</span>
                                    <span><i class="fa-solid fa-gas-pump text-emerald-400 mr-1"></i> Gasoline</span>
                                </div>
                            </div>
                        </div>
                        <div class="px-6 pb-6 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                            <div>
                                <p class="text-lg font-black text-white font-mono">₱1,600.00 <span class="text-xs font-normal text-slate-400">/day</span></p>
                                <p class="text-[10px] text-brand-400 font-bold">50% Deposit: ₱80.00</p>
                            </div>
                            <button onclick="openModal('downloadModal')" class="px-4 py-2 rounded-xl text-xs font-bold bg-brand-500 text-slate-950">Book on App</button>
                        </div>
                    </div>
                @endforelse

            </div>

        </div>
    </section>

    <!-- =========================================================================
         10. HOST / OPERATOR INCOME CALCULATOR (FOR VEHICLE OWNERS)
    ========================================================================== -->
    <section id="host-calculator" class="py-20 relative bg-brand-dark border-b border-slate-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                
                <div class="lg:col-span-6">
                    <span class="inline-flex items-center gap-1.5 text-xs uppercase font-extrabold tracking-widest text-emerald-400 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3">
                        <i class="fa-solid fa-hand-holding-dollar"></i> Monetize Your Idle Car
                    </span>
                    <h2 class="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight mb-4">
                        Turn Your Vehicle into a Mindoro Income Stream
                    </h2>
                    <p class="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                        Have an idle sedan, van, or SUV in Calapan, Puerto Galera, or Roxas? List it on Ride4Rent. You keep 90% of every rental fee. We manage KYC verification, digital handover records, and booking reservations.
                    </p>

                    <div class="space-y-3.5 text-xs sm:text-sm text-slate-300 mb-8">
                        <div class="flex items-start gap-3">
                            <i class="fa-solid fa-circle-check text-emerald-400 mt-1"></i>
                            <span><strong>You Set Your Rules:</strong> Choose Self-Drive or With Driver only. Set blackout dates anytime.</span>
                        </div>
                        <div class="flex items-start gap-3">
                            <i class="fa-solid fa-circle-check text-emerald-400 mt-1"></i>
                            <span><strong>Guaranteed Handover Balance:</strong> Renter pays you the 50% remaining balance directly at key handover.</span>
                        </div>
                        <div class="flex items-start gap-3">
                            <i class="fa-solid fa-circle-check text-emerald-400 mt-1"></i>
                            <span><strong>Zero Registration Fees:</strong> Free to list unlimited vehicles. We only charge a flat 10% platform fee on completed rentals.</span>
                        </div>
                    </div>

                    <button onclick="openModal('downloadModal')" class="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all">
                        <i class="fa-solid fa-plus-circle"></i>
                        <span>Register as Host on Android App</span>
                    </button>
                </div>

                <!-- Host Interactive Calculator Card -->
                <div class="lg:col-span-6">
                    <div class="glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-500/20 shadow-2xl relative">
                        <div class="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
                            <div>
                                <h3 class="font-display font-bold text-xl text-white">Earnings Estimator</h3>
                                <p class="text-xs text-slate-400">Based on Mindoro average seasonal demand</p>
                            </div>
                            <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400">90% Host Payout</span>
                        </div>

                        <!-- Vehicle Type Selector -->
                        <div class="mb-5">
                            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Select Your Vehicle Category</label>
                            <div class="grid grid-cols-3 gap-2">
                                <button type="button" onclick="setHostType(1600, this)" class="host-type-btn p-3 rounded-xl bg-slate-900 border border-emerald-500 text-xs font-bold text-white text-center">
                                    Sedan (₱1.6k/d)
                                </button>
                                <button type="button" onclick="setHostType(3200, this)" class="host-type-btn p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-bold text-slate-400 text-center hover:text-white">
                                    SUV (₱3.2k/d)
                                </button>
                                <button type="button" onclick="setHostType(4200, this)" class="host-type-btn p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-bold text-slate-400 text-center hover:text-white">
                                    Van (₱4.2k/d)
                                </button>
                            </div>
                        </div>

                        <!-- Days Rented Slider -->
                        <div class="mb-6">
                            <div class="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
                                <span>Days Rented Per Month:</span>
                                <span id="hostDaysLabel" class="text-emerald-400 font-mono text-sm">15 Days</span>
                            </div>
                            <input type="range" id="hostDaysSlider" min="3" max="28" value="15" oninput="calculateHostEarnings()" class="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer">
                            <div class="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                                <span>3 Days</span>
                                <span>15 Days</span>
                                <span>28 Days (High Season)</span>
                            </div>
                        </div>

                        <!-- Result Display Box -->
                        <div class="bg-slate-950 rounded-2xl p-5 border border-slate-800/80 mb-4">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-xs text-slate-400">Estimated Gross Bookings:</span>
                                <span id="hostGross" class="text-xs font-mono font-bold text-slate-300">₱24,000.00</span>
                            </div>
                            <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs text-slate-400">
                                <span>Platform Tech Fee (10%):</span>
                                <span id="hostFee" class="font-mono text-slate-400">- ₱2,400.00</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-sm font-bold text-white">Your Net Monthly Income:</span>
                                <span id="hostNet" class="font-display font-black text-2xl text-emerald-400 font-mono">₱21,600.00</span>
                            </div>
                        </div>

                        <p class="text-[11px] text-slate-500 text-center">
                            *Payouts are settled directly at pickup plus in-app balance disbursements.
                        </p>
                    </div>
                </div>

            </div>

        </div>
    </section>

    <!-- =========================================================================
         11. APK DOWNLOAD HUB & QR SCANNER TERMINAL
    ========================================================================== -->
    <section id="download" class="py-24 relative bg-slate-950 border-b border-slate-800">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            
            <span class="inline-flex items-center gap-1.5 text-xs uppercase font-extrabold tracking-widest text-brand-400 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4">
                <i class="fa-brands fa-android text-base"></i> Direct Android Release
            </span>

            <h2 class="font-display font-extrabold text-3xl sm:text-5xl text-white tracking-tight mb-4">
                Get the Ride4Rent Android App Today
            </h2>
            <p class="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-10">
                Install our official signed APK directly onto your phone. No waitlists, zero bloat, and fast performance on any Android 8.0+ smartphone.
            </p>

            <div class="glass-panel rounded-3xl p-8 sm:p-12 border border-brand-500/30 max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
                <div class="flex flex-col sm:flex-row items-center justify-center gap-8 mb-8">
                    
                    <!-- Dynamic QR Code Card -->
                    <div class="bg-white p-3 rounded-2xl shadow-xl flex flex-col items-center">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data={{ urlencode(route('app.download')) }}" 
                             alt="Scan to Download APK" 
                             class="w-36 h-36 rounded-lg">
                        <span class="text-[10px] font-bold text-slate-800 uppercase tracking-wider mt-2">Scan with Phone Camera</span>
                    </div>

                    <!-- Direct Button & Specs -->
                    <div class="text-center sm:text-left space-y-4">
                        <div class="flex items-center justify-center sm:justify-start gap-2 text-xs font-mono text-emerald-400">
                            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                            <span>Latest Stable Build • v1.0.4</span>
                        </div>

                        <a href="{{ route('app.download') }}" class="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-extrabold uppercase tracking-wider bg-gradient-to-r from-brand-400 via-brand-500 to-amber-500 text-slate-950 glow-amber hover:brightness-110 active:scale-95 transition-all">
                            <i class="fa-solid fa-download text-lg"></i>
                            <span>Download APK (Direct)</span>
                        </a>

                        <p class="text-[11px] text-slate-400">
                            Compatible with Android 8.0 to Android 15. Safe, scanned, verified package.
                        </p>
                    </div>

                </div>

                <!-- 3-Step Install Instruction Bar -->
                <div class="border-t border-slate-800/90 pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left text-xs text-slate-300">
                    <div class="flex items-start gap-2.5">
                        <span class="w-5 h-5 rounded-full bg-slate-800 text-brand-400 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                        <span>Download <code>Ride4Rent.apk</code> directly.</span>
                    </div>
                    <div class="flex items-start gap-2.5">
                        <span class="w-5 h-5 rounded-full bg-slate-800 text-brand-400 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                        <span>Allow "Install from Unknown Sources".</span>
                    </div>
                    <div class="flex items-start gap-2.5">
                        <span class="w-5 h-5 rounded-full bg-slate-800 text-brand-400 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                        <span>Open app and verify with your phone number.</span>
                    </div>
                </div>

            </div>

        </div>
    </section>

    <!-- =========================================================================
         12. FREQUENTLY ASKED QUESTIONS (ACCORDION)
    ========================================================================== -->
    <section id="faq" class="py-20 relative bg-brand-dark border-b border-slate-800">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div class="text-center max-w-2xl mx-auto mb-14">
                <span class="inline-flex items-center gap-1.5 text-xs uppercase font-extrabold tracking-widest text-brand-400 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-3">
                    <i class="fa-solid fa-circle-question"></i> Rental Clarity
                </span>
                <h2 class="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                    Frequently Asked Questions
                </h2>
                <p class="text-slate-400 text-xs sm:text-sm mt-3">
                    Everything you need to know about booking, security deposits, and driver requirements in Mindoro.
                </p>
            </div>

            <div class="space-y-4">
                
                <!-- FAQ 1 -->
                <div class="glass-panel rounded-2xl p-5 cursor-pointer" onclick="toggleFaq(this)">
                    <div class="flex items-center justify-between text-sm sm:text-base font-bold text-white">
                        <span>How does the 50% reservation deposit work?</span>
                        <i class="fa-solid fa-chevron-down text-xs text-brand-400 transition-transform duration-300 faq-icon"></i>
                    </div>
                    <div class="hidden pt-3 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 mt-3 faq-body">
                        When you book a vehicle, you only pay a 50% deposit via GCash, Maya, or card to lock the vehicle dates. This prevents ghost bookings for hosts. The remaining 50% balance is handed over directly to the operator when you inspect and take the keys.
                    </div>
                </div>

                <!-- FAQ 2 -->
                <div class="glass-panel rounded-2xl p-5 cursor-pointer" onclick="toggleFaq(this)">
                    <div class="flex items-center justify-between text-sm sm:text-base font-bold text-white">
                        <span>What happens if the vehicle has scratches or issues before I drive?</span>
                        <i class="fa-solid fa-chevron-down text-xs text-brand-400 transition-transform duration-300 faq-icon"></i>
                    </div>
                    <div class="hidden pt-3 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 mt-3 faq-body">
                        Ride4Rent includes a digital Pre-Trip Inspection inside the app. Before driving away, you and the host take timestamped photos of the exterior, fuel level gauge, and odometer. This protects your security deposit from false claims.
                    </div>
                </div>

                <!-- FAQ 3 -->
                <div class="glass-panel rounded-2xl p-5 cursor-pointer" onclick="toggleFaq(this)">
                    <div class="flex items-center justify-between text-sm sm:text-base font-bold text-white">
                        <span>What are the requirements for Self-Drive rentals?</span>
                        <i class="fa-solid fa-chevron-down text-xs text-brand-400 transition-transform duration-300 faq-icon"></i>
                    </div>
                    <div class="hidden pt-3 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 mt-3 faq-body">
                        For self-drive, you must be at least 21 years old and submit a valid Non-Professional or Professional Philippine Driver's License (or International Driving Permit for tourists) through in-app KYC verification.
                    </div>
                </div>

                <!-- FAQ 4 -->
                <div class="glass-panel rounded-2xl p-5 cursor-pointer" onclick="toggleFaq(this)">
                    <div class="flex items-center justify-between text-sm sm:text-base font-bold text-white">
                        <span>Can I rent a vehicle with a professional driver included?</span>
                        <i class="fa-solid fa-chevron-down text-xs text-brand-400 transition-transform duration-300 faq-icon"></i>
                    </div>
                    <div class="hidden pt-3 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 mt-3 faq-body">
                        Yes! Filter by "With Driver" in the marketplace. This is popular for passenger vans (HiAce / Urvan) traveling from Calapan Port to Puerto Galera, Bulalacao, or San Jose without having to navigate unfamiliar mountain roads.
                    </div>
                </div>

                <!-- FAQ 5 -->
                <div class="glass-panel rounded-2xl p-5 cursor-pointer" onclick="toggleFaq(this)">
                    <div class="flex items-center justify-between text-sm sm:text-base font-bold text-white">
                        <span>How can I register my own car as a host?</span>
                        <i class="fa-solid fa-chevron-down text-xs text-brand-400 transition-transform duration-300 faq-icon"></i>
                    </div>
                    <div class="hidden pt-3 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 mt-3 faq-body">
                        Simply download the Android app, register as an Operator, and upload your OR/CR (Vehicle Registration) and government ID. Once audited by our admin team, your vehicle will be visible to thousands of travelers across Mindoro.
                    </div>
                </div>

            </div>

        </div>
    </section>

    <!-- =========================================================================
         13. FOOTER
    ========================================================================== -->
    <footer class="bg-slate-950 border-t border-slate-800 py-16 text-slate-400 text-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">
                
                <!-- Brand col -->
                <div class="md:col-span-2 space-y-4">
                    <a href="/" class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-slate-950 font-bold text-base">
                            <i class="fa-solid fa-car-rear"></i>
                        </div>
                        <span class="font-display font-extrabold text-xl text-white">Ride<span class="text-brand-500">4</span>Rent</span>
                    </a>
                    <p class="text-slate-400 leading-relaxed max-w-sm">
                        Mindoro's premier peer-to-peer vehicle sharing marketplace. Built with passion to empower local vehicle owners and give travelers fair, verified transportation.
                    </p>
                    <div class="flex items-center gap-3 text-slate-400">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-emerald-400 font-mono">
                            <i class="fa-solid fa-shield-halved"></i> Verified Mindoro Network
                        </span>
                    </div>
                </div>

                <!-- Navigation -->
                <div>
                    <h4 class="font-display font-bold text-white uppercase tracking-wider text-xs mb-4">Explore</h4>
                    <ul class="space-y-2.5">
                        <li><a href="#how-it-works" class="hover:text-brand-400 transition-colors">How It Works</a></li>
                        <li><a href="#pricing-logic" class="hover:text-brand-400 transition-colors">50% Booking Rule</a></li>
                        <li><a href="#app-tour" class="hover:text-brand-400 transition-colors">App Screenshots</a></li>
                        <li><a href="#fleet" class="hover:text-brand-400 transition-colors">Featured Fleet</a></li>
                    </ul>
                </div>

                <!-- Hosts -->
                <div>
                    <h4 class="font-display font-bold text-white uppercase tracking-wider text-xs mb-4">Operators</h4>
                    <ul class="space-y-2.5">
                        <li><a href="#host-calculator" class="hover:text-brand-400 transition-colors">Earnings Calculator</a></li>
                        <li><a href="{{ route('admin.login') }}" class="hover:text-brand-400 transition-colors">Admin Portal</a></li>
                        <li><a href="#faq" class="hover:text-brand-400 transition-colors">Operator Guidelines</a></li>
                        <li><button onclick="openModal('downloadModal')" class="hover:text-brand-400 transition-colors text-left">Host Registration</button></li>
                    </ul>
                </div>

                <!-- Download -->
                <div>
                    <h4 class="font-display font-bold text-white uppercase tracking-wider text-xs mb-4">Mobile App</h4>
                    <ul class="space-y-2.5">
                        <li>
                            <a href="{{ route('app.download') }}" class="inline-flex items-center gap-2 text-brand-400 font-bold hover:underline">
                                <i class="fa-brands fa-android"></i> Download APK v1.0
                            </a>
                        </li>
                        <li><button onclick="openModal('qrModal')" class="hover:text-white transition-colors">Scan QR Code</button></li>
                        <li><a href="#faq" class="hover:text-white transition-colors">Installation Help</a></li>
                    </ul>
                </div>

            </div>

            <div class="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
                <p>&copy; {{ date('Y') }} Ride4Rent Platform. Capstone Project. All rights reserved.</p>
                <div class="flex items-center gap-6">
                    <a href="{{ route('admin.login') }}" class="hover:text-brand-400 transition-colors flex items-center gap-1">
                        <i class="fa-solid fa-lock text-[10px]"></i> Admin Management
                    </a>
                    <span>Calapan City, Oriental Mindoro</span>
                </div>
            </div>
        </div>
    </footer>

    <!-- =========================================================================
         14. MODALS & LIGHTBOXES
    ========================================================================== -->
    <!-- Modal: APK Download Details -->
    <div id="downloadModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md hidden flex items-center justify-center p-4">
        <div class="glass-panel rounded-3xl p-6 sm:p-8 max-w-md w-full border border-brand-500/30 relative">
            <button onclick="closeModal('downloadModal')" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <div class="text-center mb-6">
                <div class="w-14 h-14 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center text-2xl mx-auto mb-3">
                    <i class="fa-brands fa-android"></i>
                </div>
                <h3 class="font-display font-extrabold text-xl text-white">Download Ride4Rent APK</h3>
                <p class="text-xs text-slate-400 mt-1">Official signed Android build for Mindoro travelers.</p>
            </div>
            <div class="bg-slate-900 p-4 rounded-xl border border-slate-800 mb-6 text-xs text-slate-300 space-y-2">
                <div class="flex justify-between"><span>Version:</span><span class="font-mono text-brand-400">1.0.4 Release</span></div>
                <div class="flex justify-between"><span>Compatibility:</span><span>Android 8.0+</span></div>
                <div class="flex justify-between"><span>Price:</span><span class="text-emerald-400 font-bold">Free Download</span></div>
            </div>
            <a href="{{ route('app.download') }}" class="w-full py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs bg-brand-500 hover:bg-brand-400 text-slate-950 flex items-center justify-center gap-2 mb-3 shadow-lg glow-amber transition-all">
                <i class="fa-solid fa-download"></i> Start APK Download
            </a>
            <button onclick="closeModal('downloadModal'); openModal('qrModal')" class="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800">
                Scan QR Code Instead
            </button>
        </div>
    </div>

    <!-- Modal: QR Code Scanner -->
    <div id="qrModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md hidden flex items-center justify-center p-4">
        <div class="glass-panel rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-slate-700 relative text-center">
            <button onclick="closeModal('qrModal')" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <h3 class="font-display font-bold text-lg text-white mb-1">Scan With Your Phone</h3>
            <p class="text-xs text-slate-400 mb-5">Point your camera to download APK immediately</p>
            <div class="bg-white p-4 rounded-2xl inline-block shadow-2xl mb-4">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={{ urlencode(route('app.download')) }}" alt="QR Code" class="w-48 h-48">
            </div>
            <p class="text-[11px] text-slate-400">
                Direct link: <a href="{{ route('app.download') }}" class="text-brand-400 underline">Ride4Rent.apk</a>
            </p>
        </div>
    </div>

    <!-- Modal: Image Preview Lightbox -->
    <div id="imageLightbox" class="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md hidden flex items-center justify-center p-4" onclick="closeImagePreview()">
        <div class="relative max-w-md w-full flex flex-col items-center" onclick="event.stopPropagation()">
            <button onclick="closeImagePreview()" class="absolute -top-12 right-0 text-white text-xl hover:text-brand-400">
                <i class="fa-solid fa-xmark"></i> Close
            </button>
            <p id="lightboxCaption" class="text-sm font-bold text-brand-400 mb-3"></p>
            <img id="lightboxImg" src="" alt="Preview" class="w-auto max-h-[80vh] rounded-3xl border-4 border-slate-800 shadow-2xl">
        </div>
    </div>

    <!-- =========================================================================
         15. JAVASCRIPT LOGIC FOR INTERACTIVITY
    ========================================================================== -->
    <script>
        // 1. Mobile Drawer Navigation
        function toggleMobileDrawer() {
            const drawer = document.getElementById('mobileDrawer');
            const icon = document.getElementById('menuIcon');
            if (drawer.classList.contains('hidden')) {
                drawer.classList.remove('hidden');
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
            } else {
                drawer.classList.add('hidden');
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        }

        // 2. Interactive Instant Fee Calculator (in Hero)
        function calculateEstimates() {
            const dailyRate = parseFloat(document.getElementById('calcType').value) || 1500;
            const days = parseInt(document.getElementById('calcDays').value) || 3;
            const total = dailyRate * days;
            const reservation = total * 0.50; // 50% reservation fee
            const pickup = total * 0.50;      // Exact 50% balance at handover

            document.getElementById('calcTotal').innerText = '₱' + total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            document.getElementById('calcReservation').innerText = '₱' + reservation.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            document.getElementById('calcPickup').innerText = '₱' + pickup.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        }

        // 3. Phone Tab Switcher in Hero (screen1 vs screen2)
        function switchPhoneTab(mode) {
            const m1 = document.getElementById('mockupScreen1');
            const m2 = document.getElementById('mockupScreen2');
            const b1 = document.getElementById('tabBtn1');
            const b2 = document.getElementById('tabBtn2');
            const bBoth = document.getElementById('tabBtnBoth');

            // Reset buttons
            [b1, b2, bBoth].forEach(b => {
                if(b) {
                    b.classList.remove('bg-brand-500', 'text-slate-950');
                    b.classList.add('text-slate-300');
                }
            });

            if (mode === 'screen1') {
                b1.classList.add('bg-brand-500', 'text-slate-950');
                b1.classList.remove('text-slate-300');
                // Screen 1 to front
                m1.style.transform = 'scale(1) translate(0px, 0px)';
                m1.style.zIndex = '25';
                m1.style.opacity = '1';
                // Screen 2 behind
                m2.style.transform = 'scale(0.88) translate(70px, -15px)';
                m2.style.zIndex = '10';
                m2.style.opacity = '0.6';
            } else if (mode === 'screen2') {
                b2.classList.add('bg-brand-500', 'text-slate-950');
                b2.classList.remove('text-slate-300');
                // Screen 2 to front
                m2.style.transform = 'scale(1) translate(0px, 0px)';
                m2.style.zIndex = '25';
                m2.style.opacity = '1';
                // Screen 1 behind
                m1.style.transform = 'scale(0.88) translate(-70px, -15px)';
                m1.style.zIndex = '10';
                m1.style.opacity = '0.6';
            } else if (mode === 'both') {
                bBoth.classList.add('bg-brand-500', 'text-slate-950');
                bBoth.classList.remove('text-slate-300');
                // Side by side
                m1.style.transform = 'scale(0.92) translate(-60px, 0px)';
                m1.style.zIndex = '20';
                m1.style.opacity = '1';
                m2.style.transform = 'scale(0.92) translate(60px, 0px)';
                m2.style.zIndex = '20';
                m2.style.opacity = '1';
            }
        }

        // 4. Host Earnings Calculator
        let currentHostDaily = 1600;
        function setHostType(rate, btn) {
            currentHostDaily = rate;
            document.querySelectorAll('.host-type-btn').forEach(b => {
                b.classList.remove('border-emerald-500', 'text-white');
                b.classList.add('border-slate-800', 'text-slate-400');
            });
            btn.classList.add('border-emerald-500', 'text-white');
            btn.classList.remove('border-slate-800', 'text-slate-400');
            calculateHostEarnings();
        }

        function calculateHostEarnings() {
            const days = parseInt(document.getElementById('hostDaysSlider').value) || 15;
            document.getElementById('hostDaysLabel').innerText = days + ' Days';
            const gross = currentHostDaily * days;
            const fee = gross * 0.10; // 10% platform fee
            const net = gross * 0.90; // 90% host keeps

            document.getElementById('hostGross').innerText = '₱' + gross.toLocaleString('en-US', {minimumFractionDigits: 2});
            document.getElementById('hostFee').innerText = '- ₱' + fee.toLocaleString('en-US', {minimumFractionDigits: 2});
            document.getElementById('hostNet').innerText = '₱' + net.toLocaleString('en-US', {minimumFractionDigits: 2});
        }

        // 5. FAQ Accordion Toggle
        function toggleFaq(card) {
            const body = card.querySelector('.faq-body');
            const icon = card.querySelector('.faq-icon');
            if (body.classList.contains('hidden')) {
                body.classList.remove('hidden');
                icon.style.transform = 'rotate(180deg)';
            } else {
                body.classList.add('hidden');
                icon.style.transform = 'rotate(0deg)';
            }
        }

        // 6. Modal Controls
        function openModal(id) {
            document.getElementById(id).classList.remove('hidden');
        }
        function closeModal(id) {
            document.getElementById(id).classList.add('hidden');
        }

        // 7. Lightbox Zoom for Images
        function openImagePreview(url, caption) {
            document.getElementById('lightboxImg').src = url;
            document.getElementById('lightboxCaption').innerText = caption;
            document.getElementById('imageLightbox').classList.remove('hidden');
        }
        function closeImagePreview() {
            document.getElementById('imageLightbox').classList.add('hidden');
        }

        // Initialize estimates on load
        window.addEventListener('DOMContentLoaded', () => {
            calculateEstimates();
            calculateHostEarnings();
        });
    </script>
</body>
</html>
