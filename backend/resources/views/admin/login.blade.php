<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin sign in | Ride4Rent</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-screen bg-[#f3f5f2] text-[#17231d] antialiased">
    <main class="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-12 lg:px-10">
        <section class="grid w-full overflow-hidden rounded-[2rem] bg-[#173c32] shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
            <div class="flex min-h-[28rem] flex-col justify-between p-8 text-[#f4f1e8] sm:p-12">
                <div>
                    <p class="text-sm font-semibold uppercase tracking-[0.24em] text-[#e1a86b]">Ride4Rent</p>
                    <h1 class="mt-16 max-w-md text-5xl font-semibold leading-[0.95] tracking-tight sm:text-6xl">Keep the fleet moving.</h1>
                </div>
                <p class="max-w-sm text-sm leading-6 text-[#c6d2c8]">Operator applications, reviewed with care.</p>
            </div>

            <div class="bg-[#fffdf8] p-8 sm:p-12">
                <div class="mx-auto max-w-md">
                    <p class="text-sm font-semibold uppercase tracking-[0.2em] text-[#e1744d]">Admin portal</p>
                    <h2 class="mt-3 text-3xl font-semibold tracking-tight">Sign in</h2>
                    <p class="mt-2 text-sm text-[#68736c]">Use an administrator account to review operator applications.</p>

                    @if ($errors->any())
                        <div class="mt-6 rounded-xl border border-[#e6a79b] bg-[#fff0ed] px-4 py-3 text-sm text-[#963d2e]">
                            {{ $errors->first() }}
                        </div>
                    @endif

                    <form method="POST" action="{{ route('admin.login.submit') }}" class="mt-8 space-y-5">
                        @csrf
                        <label class="block text-sm font-medium" for="email">
                            Email address
                            <input class="mt-2 w-full rounded-xl border border-[#d8ded8] bg-white px-4 py-3 outline-none transition focus:border-[#e1744d] focus:ring-2 focus:ring-[#e1744d]/20" id="email" name="email" type="email" value="{{ old('email') }}" required autofocus>
                        </label>
                        <label class="block text-sm font-medium" for="password">
                            Password
                            <input class="mt-2 w-full rounded-xl border border-[#d8ded8] bg-white px-4 py-3 outline-none transition focus:border-[#e1744d] focus:ring-2 focus:ring-[#e1744d]/20" id="password" name="password" type="password" required>
                        </label>
                        <button class="w-full rounded-xl bg-[#e1744d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#c95f3c] focus:outline-none focus:ring-2 focus:ring-[#e1744d] focus:ring-offset-2" type="submit">Continue to dashboard</button>
                    </form>
                </div>
            </div>
        </section>
    </main>
</body>
</html>
