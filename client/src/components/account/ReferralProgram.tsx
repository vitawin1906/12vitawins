import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Users, Gift, Copy, Share2, UserPlus, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useState } from "react";
import { useAuthStore } from "@/stores";
import { useGetMyProfileQuery, useGetMyStatsQuery, useGetMyDownlineQuery } from "@/store/api/domains";

type AnyObj = Record<string, any>;

function extractArray<T = any>(resp: any): T[] {
    if (!resp) return [];
    if (Array.isArray(resp)) return resp as T[];

    // Частые форматы: { items: [] } / { downline: [] } / { users: [] } / { data: [] }
    const candidates = ["items", "downline", "users", "data", "list", "rows"];
    for (const key of candidates) {
        const v = (resp as AnyObj)[key];
        if (Array.isArray(v)) return v as T[];
    }

    return [];
}

const ReferralProgram = () => {
    const user = useAuthStore((state) => state.user);
    const { toast } = useToast();
    const [referralCode, setReferralCode] = useState("");
    const [isApplying, setIsApplying] = useState(false);

    // Профиль
    const { data: profile } = useGetMyProfileQuery(undefined, {
        skip: !user?.id,
    });

    // Статы MLM
    const { data: stats, isLoading: statsLoading } = useGetMyStatsQuery(undefined, {
        skip: !user?.id,
    });

    // Downline: хук ожидает объект аргументов, не undefined
    const { data: downlineResp, isLoading: downlineLoading } = useGetMyDownlineQuery(
        { maxDepth: 16 },
        { skip: !user?.id }
    );

    const referralHistory = useMemo(() => extractArray<any>(downlineResp), [downlineResp]);

    const copyReferralCode = () => {
        const codeToShare = stats?.referralCode || user?.referralCode || "";
        if (!codeToShare) return;

        navigator.clipboard.writeText(String(codeToShare));
        toast({
            title: "Реферальный код скопирован!",
            description: "Поделитесь этим кодом с друзьями, чтобы получать вознаграждения.",
        });
    };

    const applyReferralCode = async () => {
        if (!referralCode.trim()) {
            toast({
                title: "Ошибка",
                description: "Введите реферальный код",
                variant: "destructive",
            });
            return;
        }

        setIsApplying(true);
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch("/api/referral/apply", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ referralCode: referralCode.trim() }),
            });

            const data = await response.json();

            if (data?.success) {
                toast({ title: "Успешно!", description: data?.message ?? "Код применён" });
                setReferralCode("");
            } else {
                toast({
                    title: "Ошибка",
                    description: data?.message || "Не удалось применить код",
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: "Ошибка",
                description: "Произошла ошибка при применении кода",
                variant: "destructive",
            });
        } finally {
            setIsApplying(false);
        }
    };

    const appliedReferralCode = profile?.appliedReferralCode || user?.appliedReferralCode;
    const userReferralCode = stats?.referralCode || user?.referralCode || "";

    // network stats
    const totalReferrals = stats?.network?.totalReferrals ?? 0;
    const directReferrals = stats?.network?.directReferrals ?? 0;

    // ✅ Только реферальные бонусы
    const totalReferralEarnings =
        (stats?.earnings?.referralBonuses ?? 0) + (stats?.earnings?.levelBonuses ?? 0);

    return (
        <div className="space-y-6">
            {/* Your Referral Code */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base md:text-lg flex items-center">
                        <Gift className="h-4 w-4 md:h-5 md:w-5 mr-2 text-purple-500" />
                        Ваш реферальный код
                    </CardTitle>
                    <CardDescription className="text-sm">
                        Поделитесь этим кодом с друзьями и получайте вознаграждения за их покупки
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex flex-col gap-3">
                        <div className="relative">
                            <Input
                                value={userReferralCode}
                                readOnly
                                className="pr-12 text-sm md:text-base font-mono border-dashed border-purple-300"
                            />
                            <button
                                onClick={copyReferralCode}
                                type="button"
                                className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center text-gray-500 hover:text-purple-600"
                            >
                                <Copy className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button className="flex-1 text-sm" onClick={copyReferralCode} type="button">
                                <Copy className="h-4 w-4 mr-2" />
                                Копировать
                            </Button>
                            <Button variant="outline" className="flex-1 text-sm" type="button">
                                <Share2 className="h-4 w-4 mr-2" />
                                Поделиться
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Referral Stats */}
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
                <Card>
                    <CardContent className="p-4 md:p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="p-2 md:p-3 bg-purple-100 rounded-full mb-3 md:mb-4">
                                <Users className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                            </div>
                            <div className="text-2xl md:text-3xl font-bold">
                                {statsLoading ? "..." : directReferrals}
                            </div>
                            <div className="text-xs md:text-sm text-gray-500">Прямые рефералы</div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 md:p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="p-2 md:p-3 bg-blue-100 rounded-full mb-3 md:mb-4">
                                <Users className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                            </div>
                            <div className="text-2xl md:text-3xl font-bold">
                                {statsLoading ? "..." : totalReferrals}
                            </div>
                            <div className="text-xs md:text-sm text-gray-500">Всего в сети</div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 md:p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="p-2 md:p-3 bg-green-100 rounded-full mb-3 md:mb-4">
                                <Gift className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                            </div>
                            <div className="text-2xl md:text-3xl font-bold">
                                {statsLoading ? "..." : `${Number(totalReferralEarnings).toFixed(2)} ₽`}
                            </div>
                            <div className="text-xs md:text-sm text-gray-500">Реферальный доход</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Applied Referral Code Status */}
            {appliedReferralCode && (
                <Card className="border-green-200 bg-green-50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base md:text-lg flex items-center text-green-800">
                            <CheckCircle className="h-4 w-4 md:h-5 md:w-5 mr-2 text-green-600" />
                            Применен реферальный код
                        </CardTitle>
                        <CardDescription className="text-sm text-green-700">
                            Вы получаете скидку 10% на все покупки
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="flex items-center justify-between p-4 bg-white border border-green-200 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-gray-900">Код: {appliedReferralCode}</p>
                                <p className="text-xs text-gray-500">Статус: Активен</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-green-600">10%</p>
                                <p className="text-xs text-gray-500">скидка</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Apply Referral Code */}
            {!appliedReferralCode && (
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base md:text-lg flex items-center">
                            <UserPlus className="h-4 w-4 md:h-5 md:w-5 mr-2 text-blue-500" />
                            Применить реферальный код
                        </CardTitle>
                        <CardDescription className="text-sm">
                            Есть реферальный код? Введите его здесь, чтобы получить скидку 10% на все покупки
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                                <Input
                                    placeholder="Введите реферальный код"
                                    className="text-sm md:text-base"
                                    value={referralCode}
                                    onChange={(e) => setReferralCode(e.target.value)}
                                    disabled={isApplying}
                                />
                            </div>
                            <Button
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={applyReferralCode}
                                disabled={isApplying || !referralCode.trim()}
                                type="button"
                            >
                                {isApplying ? "Применяем..." : "Применить код"}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Реферальный код можно применить только один раз</p>
                    </CardContent>
                </Card>
            )}

            {/* Referral History */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base md:text-lg">История рефералов</CardTitle>
                    <CardDescription className="text-sm">
                        Все ваши приглашенные пользователи и полученные вознаграждения
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    {downlineLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : referralHistory.length > 0 ? (
                        <div className="space-y-3">
                            {referralHistory.map((referral: any) => (
                                <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-purple-100 rounded-full">
                                            <Users className="h-4 w-4 text-purple-600" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">
                                                {referral.firstName || "Пользователь"}
                                                {referral.lastName ? ` ${referral.lastName}` : ""}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {referral.email || referral.telegramId || ""}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {referral.createdAt ? new Date(referral.createdAt).toLocaleDateString("ru-RU") : ""}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-medium text-purple-600">
                                            {referral.mlmStatus === "partner_pro"
                                                ? "PRO Партнёр"
                                                : referral.mlmStatus === "partner"
                                                    ? "Партнёр"
                                                    : "Покупатель"}
                                        </div>
                                        {referral.rank ? <div className="text-xs text-gray-500">{referral.rank}</div> : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>У вас пока нет рефералов</p>
                            <p className="text-sm mt-1">Поделитесь своим кодом с друзьями!</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ReferralProgram;
