<?php

use App\Http\Controllers\Api\V1\Admin\AuditLogController;
use App\Http\Controllers\Api\V1\Admin\ReferenceController;
use App\Http\Controllers\Api\V1\Admin\UserController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ClientController;
use App\Http\Controllers\Api\V1\DepartmentController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\PasswordController;
use App\Http\Controllers\Api\V1\PasswordResetController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::get('/health', HealthController::class)->name('health');

    /*
    | Authentification. Aucune route d'inscription : les comptes sont créés par
    | le Super Administrateur (règles B1, H1).
    */
    Route::prefix('auth')->name('auth.')->group(function () {
        Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login')->name('login');
        Route::post('/forgot-password', [PasswordResetController::class, 'forgot'])->middleware('throttle:password-forgot')->name('password.forgot');
        Route::post('/reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:password-reset')->name('password.reset');

        // Accessibles même si le mot de passe temporaire n'a pas encore été changé (règle B4).
        Route::middleware(['auth:sanctum', 'account.active'])->group(function () {
            Route::get('/me', [AuthController::class, 'me'])->name('me');
            Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
            Route::put('/password', [PasswordController::class, 'update'])->middleware('throttle:password-update')->name('password.update');
        });
    });

    /*
    | Routes protégées : session valide, compte actif, mot de passe à jour,
    | puis permission propre à chaque route (règle E4).
    */
    Route::middleware(['auth:sanctum', 'account.active', 'password.changed'])->group(function () {
        /*
        | Départements (lot 1.3). Consultation selon le rôle (DepartmentPolicy, décision D1) ;
        | écriture avec la permission departments.manage (D2), vérifiée aussi par la Policy.
        */
        Route::get('/departments', [DepartmentController::class, 'index'])->name('departments.index');
        Route::get('/departments/{department}', [DepartmentController::class, 'show'])->name('departments.show');
        Route::middleware('permission:departments.manage')->group(function () {
            Route::post('/departments', [DepartmentController::class, 'store'])->name('departments.store');
            Route::patch('/departments/{department}', [DepartmentController::class, 'update'])->name('departments.update');
            Route::post('/departments/{department}/deactivate', [DepartmentController::class, 'deactivate'])->name('departments.deactivate');
            Route::post('/departments/{department}/activate', [DepartmentController::class, 'activate'])->name('departments.activate');
        });

        /*
        | Clients (lot 2.1). Consultation selon le périmètre du compte (ClientPolicy) ;
        | écriture avec la permission clients.manage (Super Administrateur et Responsable GED).
        */
        Route::get('/clients', [ClientController::class, 'index'])->name('clients.index');
        Route::get('/clients/{client}', [ClientController::class, 'show'])->name('clients.show');
        Route::middleware('permission:clients.manage')->group(function () {
            Route::post('/clients', [ClientController::class, 'store'])->name('clients.store');
            Route::patch('/clients/{client}', [ClientController::class, 'update'])->name('clients.update');
        });

        Route::prefix('admin')->name('admin.')->group(function () {
            Route::middleware('permission:users.manage')->group(function () {
                Route::get('/users', [UserController::class, 'index'])->name('users.index');
                Route::post('/users', [UserController::class, 'store'])->name('users.store');
                Route::get('/users/{user}', [UserController::class, 'show'])->name('users.show');
                Route::patch('/users/{user}', [UserController::class, 'update'])->name('users.update');
                Route::post('/users/{user}/deactivate', [UserController::class, 'deactivate'])->name('users.deactivate');
                Route::post('/users/{user}/activate', [UserController::class, 'activate'])->name('users.activate');
                Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');
                Route::post('/users/{user}/unlock', [UserController::class, 'unlock'])->name('users.unlock');
                Route::get('/roles', [ReferenceController::class, 'roles'])->name('roles');
                Route::get('/departments', [ReferenceController::class, 'departments'])->name('departments');
            });

            Route::get('/audit-logs', [AuditLogController::class, 'index'])
                ->middleware('permission:journal.view')
                ->name('audit-logs.index');
        });
    });
});
