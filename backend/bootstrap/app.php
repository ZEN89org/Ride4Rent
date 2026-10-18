<?php

use App\Http\Middleware\ActiveOperatorMiddleware;
use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\AdminWebMiddleware;
use App\Http\Middleware\EnforcePlatformAccess;
use App\Http\Middleware\PersistUploadedStorageFiles;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withCommands([
        __DIR__.'/../app/Console/Commands',
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');
        $middleware->api(append: [EnforcePlatformAccess::class]);

        $middleware->redirectTo(
            guests: '/admin/login',
            users: '/admin/dashboard',
        );

        $middleware->append(PersistUploadedStorageFiles::class);

        $middleware->alias([
            'admin' => AdminMiddleware::class,
            'admin.web' => AdminWebMiddleware::class,
            'active.operator' => ActiveOperatorMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
