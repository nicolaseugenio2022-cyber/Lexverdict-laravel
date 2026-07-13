<?php

namespace App\Http\Controllers\Auth;

use App\Domain\Identity\Actions\ResolveStaffLanding;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use App\Support\AuditRecorder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Login');
    }

    public function store(LoginRequest $request, AuditRecorder $audit, ResolveStaffLanding $landing): RedirectResponse
    {
        $key = Str::lower($request->string('username')->toString()).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages([
                'username' => 'Too many login attempts. Please try again later.',
            ]);
        }

        $credentials = [
            'username' => $request->string('username')->toString(),
            'password' => $request->string('password')->toString(),
            'is_active' => true,
        ];

        if (! Auth::attempt($credentials, true)) {
            RateLimiter::hit($key, 60);
            $audit->record('auth.login_failed', null, User::class, null, [
                'username' => $request->string('username')->toString(),
            ], $request);

            throw ValidationException::withMessages([
                'username' => 'Invalid username or password.',
            ]);
        }

        RateLimiter::clear($key);
        $request->session()->regenerate();

        /** @var User $user */
        $user = Auth::user();
        $user->forceFill(['last_login_at' => now()])->save();

        $audit->record('auth.login', $user, User::class, $user->id, null, $request);

        return redirect()->route($landing->routeName($user));
    }

    public function destroy(Request $request, AuditRecorder $audit): RedirectResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if ($user) {
            $audit->record('auth.logout', $user, User::class, $user->id, null, $request);
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
