import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        username: '',
        password: '',
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        post('/login');
    }

    return (
        <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--lv-bg)] px-4 py-8 text-slate-950 sm:py-10">
            <Head title="Staff Login" />
            <div className="w-full max-w-md">
                <header className="login-header rounded-t-md border border-b-0 border-institution-950 bg-institution-950 px-5 py-4 text-white sm:px-6 sm:py-5">
                    <div className="flex items-center gap-3">
                        <img
                            src="/images/branding/doj-seal.png"
                            alt="Department of Justice seal"
                            className="brand-logo login-brand-logo"
                        />
                        <div className="min-w-0">
                            <p className="text-lg leading-6 font-bold">LexVerdict</p>
                            <p className="mt-0.5 text-sm leading-5 text-slate-300">
                                Prosecutor Office Case Management
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 h-0.5 w-12 bg-gold-500" aria-hidden="true" />
                </header>
                <form onSubmit={submit} className="surface rounded-t-none border-t-0 p-5 sm:p-6">
                    <h1 className="text-xl font-bold text-institution-950">Staff Login</h1>

                    <div className="mt-5 space-y-4">
                        <div>
                            <label htmlFor="username" className="field-label">
                                Username
                            </label>
                            <input
                                id="username"
                                value={data.username}
                                onChange={(event) => setData('username', event.target.value)}
                                autoComplete="username"
                                aria-invalid={errors.username ? 'true' : undefined}
                                aria-describedby={errors.username ? 'username-error' : undefined}
                                className="input mt-2"
                            />
                            {errors.username && (
                                <p id="username-error" className="field-error" role="alert">
                                    {errors.username}
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password" className="field-label">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={data.password}
                                onChange={(event) => setData('password', event.target.value)}
                                autoComplete="current-password"
                                aria-invalid={errors.password ? 'true' : undefined}
                                aria-describedby={errors.password ? 'password-error' : undefined}
                                className="input mt-2"
                            />
                            {errors.password && (
                                <p id="password-error" className="field-error" role="alert">
                                    {errors.password}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 grid gap-3">
                        <button
                            type="submit"
                            disabled={processing}
                            className="btn btn-primary w-full"
                        >
                            Login
                        </button>
                        <Link href="/docket" className="btn btn-secondary w-full">
                            Case Lookup
                        </Link>
                    </div>
                </form>
            </div>
        </main>
    );
}
