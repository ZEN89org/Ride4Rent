<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Sign In | Ride4Rent</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="admin-login">
    <main class="admin-login-frame">
        <section class="admin-login-story" aria-label="Ride4Rent administration">
            <div class="flex items-center gap-3">
                <div class="admin-brand-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 19L9 5h6l4 14M12 7v3m0 4v3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
                <div><div class="admin-brand-title">Ride4Rent<span style="color:#F5C344">.</span></div><p class="admin-brand-subtitle">Administration</p></div>
            </div>
            <div style="position:relative;z-index:1">
                <p class="admin-eyebrow" style="color:#A5BCAE">One community. Every journey.</p>
                <h1>A better ride<br>starts with<br><span>a well-run marketplace.</span></h1>
                <p>Your space to support operators, review payments, and keep the Ride4Rent community moving.</p>
            </div>
            <div class="admin-login-note"><strong>Built for Oriental Mindoro</strong><p>Connecting local hosts and renters, one ride at a time.</p></div>
        </section>
        <section class="admin-login-form">
            <p class="admin-eyebrow">Welcome back</p>
            <h2>Sign in to your workspace</h2>
            <p>Use your administrator account to continue.</p>
            @if (isset($errors) && $errors->any())
                <div class="admin-login-error" role="alert">{{ $errors->first() }}</div>
            @endif
            <form method="POST" action="{{ route('admin.login.submit') }}">
                @csrf
                <label for="email">Email address</label>
                <input id="email" name="email" type="email" value="{{ old('email') }}" placeholder="you@ride4rent.com" autocomplete="username" required autofocus @if($errors->has('email')) aria-invalid="true" @endif>
                <label for="password">Password</label>
                <div class="admin-login-password">
                    <input id="password" name="password" type="password" placeholder="Enter your password" autocomplete="current-password" required>
                    <button id="password-toggle" type="button" class="admin-password-toggle" aria-label="Show password" aria-controls="password" aria-pressed="false">Show</button>
                </div>
                <button type="submit" class="admin-login-submit">Sign in <span aria-hidden="true" style="float:right">→</span></button>
            </form>
            <p class="admin-login-footnote">For authorized administrators. Sign-ins and administrative actions are recorded in the audit trail.</p>
            <p style="font-size:10px;color:#849087;margin-top:22px">© {{ date('Y') }} Ride4Rent</p>
        </section>
    </main>
    <script>
        document.getElementById('password-toggle').addEventListener('click', function () {
            const password = document.getElementById('password');
            const show = password.type === 'password';
            password.type = show ? 'text' : 'password';
            this.textContent = show ? 'Hide' : 'Show';
            this.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
            this.setAttribute('aria-pressed', String(show));
        });
    </script>
</body>
</html>
