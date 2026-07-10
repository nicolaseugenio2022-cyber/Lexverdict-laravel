import { Head, useForm } from '@inertiajs/react';
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
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-950">
            <Head title="Staff Login" />
            <form onSubmit={submit} className="w-full max-w-sm rounded-md border border-slate-200 bg-white p-6">
                <h1 className="text-xl font-semibold">LexVerdict Staff Login</h1>

                <div className="mt-6">
                    <label htmlFor="username" className="text-sm font-medium text-slate-700">
                        Username
                    </label>
                    <input
                        id="username"
                        value={data.username}
                        onChange={(event) => setData('username', event.target.value)}
                        autoComplete="username"
                        className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                    {errors.username && <p className="mt-2 text-sm text-red-700">{errors.username}</p>}
                </div>

                <div className="mt-4">
                    <label htmlFor="password" className="text-sm font-medium text-slate-700">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={data.password}
                        onChange={(event) => setData('password', event.target.value)}
                        autoComplete="current-password"
                        className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                    {errors.password && <p className="mt-2 text-sm text-red-700">{errors.password}</p>}
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="mt-6 min-h-11 w-full rounded-md bg-blue-900 px-4 font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Login
                </button>
            </form>
        </main>
    );
}
