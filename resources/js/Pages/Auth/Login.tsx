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
        <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--lv-bg)] px-4 py-10 text-slate-950">
            <Head title="Staff Login" />
            <div className="w-full max-w-md">
                <header className="login-header rounded-t-md border border-b-0 border-institution-950 bg-institution-950 px-6 py-5 text-white">
                    <div className="flex items-center gap-3">
                        <span className="brand-mark" aria-hidden="true">
                            LV
                        </span>
                        <div>
                            <p className="text-lg font-bold">LexVerdict</p>
                            <p className="text-sm text-slate-300">
                                Prosecutor Office Case Management
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 h-0.5 w-14 bg-gold-500" aria-hidden="true" />
                </header>
                <form onSubmit={submit} className="surface rounded-t-none border-t-0 p-6 sm:p-7">
                    <h1 className="text-xl font-bold text-institution-950">Staff Login</h1>

                    <div className="mt-6">
                        <label htmlFor="username" className="field-label">
                            Username
                        </label>
                        <input
                            id="username"
                            value={data.username}
                            onChange={(event) => setData('username', event.target.value)}
                            autoComplete="username"
                            className="input mt-2"
                        />
                        {errors.username && <p className="field-error">{errors.username}</p>}
                    </div>

                    <div className="mt-4">
                        <label htmlFor="password" className="field-label">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={data.password}
                            onChange={(event) => setData('password', event.target.value)}
                            autoComplete="current-password"
                            className="input mt-2"
                        />
                        {errors.password && <p className="field-error">{errors.password}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="btn btn-primary mt-6 w-full"
                    >
                        Login
                    </button>
                    <Link href="/docket" className="btn btn-secondary mt-3 w-full">
                        Case Lookup
                    </Link>
                </form>
            </div>
        </main>
    );
}
