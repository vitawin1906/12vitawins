import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useToast } from "../hooks/use-toast";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import { useLoginMutation } from "@/store/api/domains/authApi";
import { useAuthStore } from "@/stores/authStore";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function Login() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [login, { isLoading }] = useLoginMutation();
    const [searchParams] = useSearchParams();

    const setUser = useAuthStore((s) => s.setUser);
    const setTokens = useAuthStore((s) => s.setTokens);

    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({ email: "", password: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const res = await login(formData).unwrap();

            const token =
                res.accessToken ||
                res.token ||
                res.authToken ||
                null;

            if (token) setTokens(token, res.refreshToken || null);

            await new Promise((resolve) => setTimeout(resolve, 50));

            if (res.user) setUser(res.user);

            toast({
                title: "Успешный вход!",
                description: "Добро пожаловать обратно",
            });

            if (res.user?.isAdmin) {
                navigate("/admin", { replace: true });
            } else {
                navigate("/account", { replace: true });
            }

        } catch (err: any) {
            console.error("Login error:", err);

            toast({
                title: "Ошибка входа",
                description: err?.data?.message || err?.message || "Неверный email или пароль",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 relative">

            {/* === КНОПКА НАЗАД (shadcn ghost) === */}
            <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="absolute top-4 left-4 text-gray-700 dark:text-gray-200 hover:bg-gray-200/40 dark:hover:bg-gray-700/40"
            >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Назад
            </Button>

            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Вход в VitaWin</CardTitle>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Войдите, чтобы начать делать покупки и зарабатывать бонусы
                    </p>
                </CardHeader>

                <CardContent className="space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-4">

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                                required
                                disabled={isLoading}
                                placeholder="you@example.com"
                            />
                        </div>

                        {/* === ПАРОЛЬ (ГЛАЗ + АНИМАЦИЯ) === */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="password">Пароль</Label>

                                {/* === ЗАБЫЛИ ПАРОЛЬ === */}
                                <Link
                                    to="/forgot-password"
                                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                    Забыли пароль?
                                </Link>
                            </div>

                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                                    required
                                    minLength={6}
                                    disabled={isLoading}
                                    placeholder="••••••••"
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-transform active:scale-90"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading || !formData.email || !formData.password}
                            className="w-full"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Вход...
                                </>
                            ) : (
                                "Войти"
                            )}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">или</span>
                        </div>
                    </div>
                    <Button
                        onClick={() => {
                            const ref = searchParams.get('ref') || '';
                            const qs = ref ? `?ref=${encodeURIComponent(ref)}` : '';
                            window.location.href = `/api/auth/google/init${qs}`;
                        }}
                        className="w-full"
                    >
                        Войти через Google
                    </Button>
                    <div className="text-center text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Ещё нет аккаунта? </span>
                        <Link
                            to="/registry"
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                        >
                            Зарегистрироваться
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
