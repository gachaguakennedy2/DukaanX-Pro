import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { BRAND_ADMIN_EMAIL, BRAND_LOGO_URL, BRAND_LOGO_WIDTH_PX, BRAND_NAME } from '../lib/brand';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth(); // We need to add this to AuthContext
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/');
        } catch (err: unknown) {
            console.error(err);
            setError('Failed to login. Please check credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-[hsl(var(--color-primary))] p-8 text-center">
                    <img
                        src={BRAND_LOGO_URL}
                        alt={BRAND_NAME}
                        width={BRAND_LOGO_WIDTH_PX}
                        className="h-auto mx-auto mb-4"
                    />
                    <h1 className="text-3xl font-bold text-white mb-2">{BRAND_NAME}</h1>
                    <p className="text-emerald-100">Sign in to your dashboard</p>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[hsl(var(--color-primary))] focus:border-transparent outline-none transition-all"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="password"
                                    required
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[hsl(var(--color-primary))] focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-4 w-full bg-[hsl(var(--color-primary))] text-white py-3 rounded-lg font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all flex justify-center items-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-500">
                        <p>Default: {BRAND_ADMIN_EMAIL} / password</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
