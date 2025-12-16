import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import { useRegisterMutation } from "@/store/api/domains/authApi";
import { useAuthStore } from "@/stores/authStore";
import { ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";

export default function Register() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchParams] = useSearchParams();

    const [registerMutation, { isLoading }] = useRegisterMutation();

    const setUser = useAuthStore((state) => state.setUser);
    const setTokens = useAuthStore((state) => state.setTokens);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        phone: "",
        referralCode: "",
    });

    const [passwordError, setPasswordError] = useState("");

    // === FIX: правильная валидация паролей ===
    useEffect(() => {
        if (!formData.password || !formData.confirmPassword) {
            setPasswordError("");
            return;
        }
        if (formData.password.length < 6) {
            setPasswordError("Пароль должен быть не менее 6 символов");
        } else if (formData.password !== formData.confirmPassword) {
            setPasswordError("Пароли не совпадают");
        } else {
            setPasswordError("");
        }
    }, [formData.password, formData.confirmPassword]);

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordError) return;

        try {
            const result = await registerMutation({
                email: formData.email,
                password: formData.password,
                firstName: formData.firstName,
                phone: formData.phone || undefined,
                referralCode: formData.referralCode || undefined,
            }).unwrap();

            if (result.accessToken) {
                setTokens(result.accessToken, result.refreshToken);
            }
            if (result.user) {
                setUser(result.user);
            }

            toast({
                title: "Успешная регистрация!",
                description: "Добро пожаловать в VitaWin",
            });

            navigate("/dashboard");
        } catch (err: any) {
            console.error("Register error:", err);

            toast({
                title: "Ошибка регистрации",
                description: err?.data?.message || err?.message || "Не удалось зарегистрироваться",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 relative">

            <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="absolute top-4 left-4 text-gray-700 dark:text-gray-200 hover:bg-gray-200/40 dark:hover:bg-gray-700/40"
            >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Назад
            </Button>

            <Card className="w-full max-w-md relative">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Регистрация</CardTitle>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Создайте аккаунт и начните зарабатывать бонусы
                    </p>
                </CardHeader>

                <CardContent className="space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange("email", e.target.value)}
                                required
                                disabled={isLoading}
                                placeholder="your@email.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="firstName">Имя *</Label>
                            <Input
                                id="firstName"
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => handleChange("firstName", e.target.value)}
                                required
                                disabled={isLoading}
                                placeholder="Иван"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Номер телефона</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => handleChange("phone", e.target.value)}
                                disabled={isLoading}
                                placeholder="+7 (999) 123-45-67"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Пароль *</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => handleChange("password", e.target.value)}
                                    required
                                    disabled={isLoading}
                                    minLength={6}
                                    placeholder="Минимум 6 символов"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2"
                                >
                                    {showPassword ? <EyeOff /> : <Eye />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Подтвердите пароль *</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirm ? "text" : "password"}
                                    value={formData.confirmPassword}
                                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                                    required
                                    disabled={isLoading}
                                    minLength={6}
                                    placeholder="Повторите пароль"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm((v) => !v)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2"
                                >
                                    {showConfirm ? <EyeOff /> : <Eye />}
                                </button>
                            </div>
                        </div>

                        {passwordError && (
                            <div className="text-sm text-red-600 dark:text-red-400">
                                {passwordError}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="referralCode">Реферальный код (опционально)</Label>
                            <Input
                                id="referralCode"
                                type="text"
                                value={formData.referralCode}
                                onChange={(e) => handleChange("referralCode", e.target.value)}
                                disabled={isLoading}
                                placeholder="Введите код реферала"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={
                                isLoading ||
                                !formData.email ||
                                !formData.firstName ||
                                !formData.password ||
                                !formData.confirmPassword ||
                                Boolean(passwordError)
                            }
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Регистрация...
                                </>
                            ) : (
                                "Зарегистрироваться"
                            )}
                        </Button>
                    </form>
                    <Button
                        onClick={() => {
                            const ref = searchParams.get('ref') || '';
                            const qs = ref ? `?ref=${encodeURIComponent(ref)}` : '';
                            window.location.href = `/api/auth/google/init${qs}`;
                        }}
                        className="w-full"
                    >
                        Регистрация через Google
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
