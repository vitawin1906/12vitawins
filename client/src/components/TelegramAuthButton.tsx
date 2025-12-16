// client/src/components/TelegramAuthButton.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import {
    useTelegramBotLoginMutation,
    useTelegramAuthMutation
} from '@/store/api/domains/authApi';
import { ExternalLink, MessageCircle, Loader2 } from 'lucide-react';

interface TelegramAuthButtonProps {
    mode?: 'bot-login' | 'widget';
    variant?: 'button' | 'card' | 'modal';
    isOpen?: boolean;
    onClose?: () => void;
    onSuccess?: (user: any) => void;
    onError?: (error: string) => void;
    showDemo?: boolean; // Dev mode quick login
}

export function TelegramAuthButton({
                                       mode = 'bot-login',
                                       variant = 'button',
                                       isOpen,
                                       onClose,
                                       onSuccess,
                                       onError,
                                       showDemo = process.env.NODE_ENV === 'development',
                                   }: TelegramAuthButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { setUser, setTokens } = useAuthStore();

    const [telegramBotLogin] = useTelegramBotLoginMutation();
    const [telegramAuth] = useTelegramAuthMutation();

    // ═══════════════════════════════════════════════════════════
    // MAIN AUTH FUNCTION
    // ═══════════════════════════════════════════════════════════
    const handleTelegramAuth = async (telegramData?: any) => {
        setIsLoading(true);

        try {
            // 1️⃣ Telegram WebApp API (если внутри Telegram Mini App)
            if (!telegramData && window.Telegram?.WebApp?.initDataUnsafe?.user) {
                const user = window.Telegram.WebApp.initDataUnsafe.user;
                telegramData = {
                    telegramId: String(user.id),
                    firstName: user.first_name,
                    username: user.username || undefined,
                };
            }

            // 2️⃣ Если передали данные напрямую (например, из demo кнопки)
            if (telegramData) {
                const res = await telegramBotLogin({
                    telegramId: telegramData.telegramId || String(telegramData.id),
                    firstName: telegramData.firstName || telegramData.first_name,
                    username: telegramData.username,
                }).unwrap();

                // Normalize response
                const accessToken = res.accessToken || res.authToken || res.token;
                if (accessToken) {
                    setTokens(accessToken, res.refreshToken);
                }
                if (res.user) {
                    setUser(res.user);
                }

                toast({
                    title: "Успешная авторизация!",
                    description: `Добро пожаловать, ${res.user?.firstName}!`,
                });

                setIsLoading(false);
                onSuccess?.(res.user);
                onClose?.();
                return;
            }

            // 3️⃣ Открыть бота для авторизации
            const botUsername = 'vitawin_bot';
            const startParam = 'auth';
            const deepLink = `https://t.me/${botUsername}?start=${startParam}`;

            window.open(deepLink, '_blank');

            toast({
                title: "Переход в Telegram",
                description: "Откройте бот @vitawin_bot и следуйте инструкциям",
            });

            setIsLoading(false);
        } catch (error: any) {
            console.error('Telegram auth error:', error);

            const errorMsg = error?.data?.message || error?.message || 'Ошибка авторизации';

            toast({
                title: "Ошибка",
                description: errorMsg,
                variant: "destructive",
            });

            setIsLoading(false);
            onError?.(errorMsg);
        }
    };

    // ═══════════════════════════════════════════════════════════
    // DEV MODE: QUICK DEMO LOGIN
    // ═══════════════════════════════════════════════════════════
    const handleQuickDemo = (demoUser: any) => {
        handleTelegramAuth({
            telegramId: String(demoUser.id),
            firstName: demoUser.firstName,
            username: demoUser.username,
        });
    };

    // ═══════════════════════════════════════════════════════════
    // RENDER: BUTTON VARIANT
    // ═══════════════════════════════════════════════════════════
    if (variant === 'button') {
        return (
            <Button
                onClick={() => handleTelegramAuth()}
                disabled={isLoading}
                className="w-full bg-[#0088cc] hover:bg-[#0077bb] text-white"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Загрузка...
                    </>
                ) : (
                    <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Войти через Telegram
                    </>
                )}
            </Button>
        );
    }

    // ═══════════════════════════════════════════════════════════
    // RENDER: CARD VARIANT
    // ═══════════════════════════════════════════════════════════
    if (variant === 'card') {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-blue-600" />
                        Вход через Telegram
                    </CardTitle>
                    <CardDescription>
                        Авторизуйтесь через Telegram бот для доступа к системе
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <Button
                        onClick={() => handleTelegramAuth()}
                        className="w-full bg-[#0088cc] hover:bg-[#0077bb] text-white"
                        disabled={isLoading}
                    >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Войти через @vitawin_bot
                    </Button>

                    <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
                        <strong>Инструкция:</strong>
                        <br />1. Нажмите кнопку выше
                        <br />2. В боте отправьте /start auth
                        <br />3. Получите ссылку для авторизации
                        <br />4. Нажмите ссылку для входа
                    </div>

                    {showDemo && (
                        <div className="pt-3 border-t">
                            <p className="text-xs text-gray-500 mb-2">Быстрый вход (dev):</p>
                            <div className="space-y-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => handleQuickDemo({
                                        id: '131632979',
                                        firstName: 'Eugene',
                                        username: 'alievgeniy',
                                    })}
                                    disabled={isLoading}
                                >
                                    Eugene Aliev (Тест)
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    // ═══════════════════════════════════════════════════════════
    // RENDER: MODAL VARIANT
    // ═══════════════════════════════════════════════════════════
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center">Вход через Telegram</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 p-4">
                    <div className="w-16 h-16 bg-[#0088cc] rounded-full flex items-center justify-center mx-auto">
                        <MessageCircle className="w-8 h-8 text-white" />
                    </div>

                    <Button
                        onClick={() => handleTelegramAuth()}
                        disabled={isLoading}
                        className="w-full bg-[#0088cc] hover:bg-[#0077b3] text-white"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Открытие...
                            </>
                        ) : (
                            <>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Открыть @vitawin_bot
                            </>
                        )}
                    </Button>

                    {showDemo && (
                        <Button
                            variant="outline"
                            onClick={() => handleQuickDemo({
                                id: '131632979',
                                firstName: 'Eugene',
                                username: 'alievgeniy',
                            })}
                            disabled={isLoading}
                            className="w-full"
                        >
                            Demo Login (Eugene)
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}