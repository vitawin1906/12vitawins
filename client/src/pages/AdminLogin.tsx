// src/pages/AdminLogin.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from '../components/ui/card';
import SEOHead from '../components/SEOHead';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Lock, Eye, EyeOff } from 'lucide-react';

import {
    useAuthStore,
    selectIsAuthenticated,
    selectIsAdmin
} from "@/stores/authStore";

import { useAdminLoginMutation } from "@/store/api/domains";

const AdminLogin = () => {
    const navigate = useNavigate();

    const isAuthenticated = useAuthStore(selectIsAuthenticated);
    const isAdmin = useAuthStore(selectIsAdmin);

    const clearUser = useAuthStore((s) => s.clearUser);
    const setUser = useAuthStore((s) => s.setUser);
    const setTokens = useAuthStore((s) => s.setTokens);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const [adminLogin, { isLoading }] = useAdminLoginMutation();

    // ⛔ Юзер пытается зайти на admin/login → логаутим
    useEffect(() => {
        if (isAuthenticated && !isAdmin) {
            clearUser();
        }

        // Уже админ → сразу в админку
        if (isAuthenticated && isAdmin) {
            navigate('/admin', { replace: true });
        }
    }, [isAuthenticated, isAdmin, clearUser, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await adminLogin({ email, password }).unwrap();

            // ✅ Сохраняем ОБЫЧНЫЕ токены (как в login.tsx)
            const token = res.accessToken || res.token || res.authToken || null;
            if (token) {
                setTokens(token, res.refreshToken || null);
            }

            // Даем persist записать
            await new Promise((r) => setTimeout(r, 50));

            if (res.user) setUser(res.user);

            navigate('/admin', { replace: true });

        } catch (err: any) {
            setError(
                err?.data?.message ||
                err?.data?.error ||
                err?.message ||
                "Ошибка входа в админ-панель"
            );
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
            <SEOHead title="Вход в админку — VitaWin" noindex={true} />

            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto bg-emerald-600 rounded-full p-3">
                        <Lock className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle>Вход в админку</CardTitle>
                    <CardDescription>Только для администраторов</CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Пароль</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2"
                                >
                                    {showPassword ? <EyeOff /> : <Eye />}
                                </button>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Вход..." : "Войти"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminLogin;
