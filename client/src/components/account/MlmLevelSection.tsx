import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
    Trophy,
    Crown,
    Users,
    Target,
    TrendingUp,
    ShoppingBag,
    CheckCircle,
    Lock,
} from "lucide-react";
import { useGetMyStatsQuery } from "@/store/api/domains";
import { useAuthStore } from "@/stores";
import type { MlmStatus } from "@/types/user";
import {
    MLM_STATUS_CONFIG,
    MLM_STATUS_ORDER,
    mapMlmStatus,
    type MlmStatusKey,
} from "@/constants/mlmStatuses";

// 🔹 UI-специфичная конфигурация (иконки, градиенты, описания, список бенефитов)
// Бизнес-числа (PV, activationPrice) берем из MLM_STATUS_CONFIG
const MLM_UI_CONFIG: Record<
    MlmStatusKey,
    {
        name: string;
        description: string;
        icon: React.ComponentType<{ className?: string }>;
        color: string;
        badgeColor: string;
        benefits: string[];
    }
> = {
    customer: {
        name: "Покупатель",
        description: "Базовый статус",
        icon: ShoppingBag,
        color: "from-gray-400 to-gray-500",
        badgeColor: "bg-gray-500",
        benefits: [
            "Покупка товаров со скидкой",
            "Кэшбек VWC 5%",
            "Реферальная скидка 10%",
        ],
    },
    partner: {
        name: "Партнёр",
        description: "Активный участник",
        icon: Trophy,
        color: "from-blue-500 to-cyan-500",
        badgeColor: "bg-blue-500",
        benefits: [
            "Все бонусы покупателя",
            "Бонусы с сети (L1-L15)",
            "FastStart бонус",
            "Infinity бонус",
            "Участие в Network Fund",
        ],
    },
    partner_pro: {
        name: "Partner PRO",
        description: "Профессиональный партнёр",
        icon: Crown,
        color: "from-purple-500 to-pink-500",
        badgeColor: "bg-purple-500",
        benefits: [
            "Все бонусы партнёра",
            "Повышенные проценты",
            "Option3 бонус",
            "Freedom Shares",
            "Приоритетная поддержка",
        ],
    },
};

export default function MlmLevelSection() {
    const user = useAuthStore((state) => state.user);

    const { data: stats, isLoading, error } = useGetMyStatsQuery(undefined, {
        skip: !user?.id,
    });

    // Ключ статуса с учетом бэкенда
    const currentStatusKey: MlmStatusKey = mapMlmStatus(user?.mlmStatus);
    const businessConfig = MLM_STATUS_CONFIG[currentStatusKey];
    const uiConfig = MLM_UI_CONFIG[currentStatusKey];
    const CurrentIcon = uiConfig.icon;

    // Определяем индекс и следующий статус
    const currentIndex = MLM_STATUS_ORDER.indexOf(currentStatusKey);
    const nextStatusKey: MlmStatusKey | null =
        currentIndex >= 0 && currentIndex < MLM_STATUS_ORDER.length - 1
            ? MLM_STATUS_ORDER[currentIndex + 1]
            : null;

    const nextBusinessConfig = nextStatusKey
        ? MLM_STATUS_CONFIG[nextStatusKey]
        : null;
    const nextUiConfig = nextStatusKey ? MLM_UI_CONFIG[nextStatusKey] : null;

    // Прогресс до следующего статуса на основе PV
    const currentPV = stats?.personalVolume.totalPV ?? 0;
    const requiredPV = nextBusinessConfig?.personalVolume ?? 0;

    const progressPercentage =
        nextBusinessConfig && requiredPV > 0
            ? Math.min((currentPV / requiredPV) * 100, 100)
            : 100;

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Статус партнёра</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                        <div className="h-8 bg-gray-200 rounded" />
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Статус партнёра</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-500">Ошибка загрузки статуса</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Текущий статус */}
            <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
                <div
                    className={`relative bg-gradient-to-br ${uiConfig.color} p-6 text-white`}
                >
                    <div className="absolute top-4 right-4">
                        <Badge className={`${uiConfig.badgeColor} text-white text-xs`}>
                            {currentStatusKey === "partner_pro" ? "PRO" : uiConfig.name}
                        </Badge>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-16 h-16 bg-white/20 rounded-lg">
                            <CurrentIcon className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold">
                                {businessConfig.alias || uiConfig.name}
                            </h2>
                            <p className="text-white/80 text-sm">{uiConfig.description}</p>
                            <div className="mt-2 flex items-center space-x-4">
                                <div className="flex items-center space-x-1">
                                    <Users className="h-4 w-4" />
                                    <span className="text-sm">
                    {stats?.network.totalReferrals ?? 0} рефералов
                  </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <Target className="h-4 w-4" />
                                    <span className="text-sm">{currentPV} PV</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <CardContent className="p-6">
                    {nextStatusKey && nextBusinessConfig && nextUiConfig ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">
                                        Прогресс до статуса "{nextUiConfig.name}"
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Необходимо {requiredPV} PV (сейчас: {currentPV} PV)
                                    </p>
                                </div>
                                <Badge variant="outline">{Math.round(progressPercentage)}%</Badge>
                            </div>

                            <div className="space-y-2">
                                <Progress value={progressPercentage} className="h-2" />
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>{currentPV} PV текущих</span>
                                    <span>{requiredPV} PV требуется</span>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="flex items-center space-x-2 mb-2">
                                    <TrendingUp className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-900">
                    Следующий статус: {nextUiConfig.name}
                  </span>
                                </div>
                                <p className="text-xs text-blue-700 mb-2">
                                    Активация:{" "}
                                    {nextBusinessConfig.activationPrice.toLocaleString("ru-RU")} ₽
                                </p>
                                <div className="text-xs text-blue-600">
                                    Или накопите {requiredPV} PV через покупки
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <Crown className="h-12 w-12 mx-auto mb-2 text-yellow-500" />
                            <h3 className="font-semibold text-gray-900">
                                Максимальный статус достигнут!
                            </h3>
                            <p className="text-sm text-gray-600">
                                Вы Partner PRO — высший статус в системе
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Преимущества текущего статуса */}
            <Card>
                <CardHeader>
                    <CardTitle>Преимущества вашего статуса</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2">
                        {uiConfig.benefits.map((benefit, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700">{benefit}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>

            {/* Все статусы */}
            <Card>
                <CardHeader>
                    <CardTitle>Партнёрские статусы</CardTitle>
                    <p className="text-sm text-gray-600">
                        Три уровня участия в программе VitaWin
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        {MLM_STATUS_ORDER.map((statusKey) => {
                            const config = MLM_STATUS_CONFIG[statusKey];
                            const ui = MLM_UI_CONFIG[statusKey];
                            const isCurrentStatus = statusKey === currentStatusKey;
                            const isAchieved =
                                MLM_STATUS_ORDER.indexOf(statusKey) <= currentIndex;
                            const StatusIcon = ui.icon;

                            return (
                                <div
                                    key={statusKey}
                                    className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                                        isCurrentStatus
                                            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                                            : isAchieved
                                                ? "border-green-200 bg-green-50"
                                                : "border-gray-200 bg-gray-50"
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div
                                            className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                                                isAchieved
                                                    ? `bg-gradient-to-br ${ui.color}`
                                                    : "bg-gray-300"
                                            }`}
                                        >
                                            {isAchieved ? (
                                                <StatusIcon className="h-5 w-5 text-white" />
                                            ) : (
                                                <Lock className="h-5 w-5 text-gray-500" />
                                            )}
                                        </div>
                                        {isCurrentStatus && (
                                            <Badge className="bg-blue-500 text-white text-xs">
                                                Текущий
                                            </Badge>
                                        )}
                                    </div>

                                    <h4
                                        className={`font-semibold mb-2 ${
                                            isCurrentStatus
                                                ? "text-blue-900"
                                                : isAchieved
                                                    ? "text-green-900"
                                                    : "text-gray-600"
                                        }`}
                                    >
                                        {config.alias || ui.name}
                                    </h4>

                                    <div className="space-y-1 text-xs text-gray-600">
                                        {config.activationPrice > 0 && (
                                            <div>
                                                Активация:{" "}
                                                {config.activationPrice.toLocaleString("ru-RU")} ₽
                                            </div>
                                        )}
                                        {config.personalVolume > 0 && (
                                            <div>Требуется: {config.personalVolume} PV</div>
                                        )}
                                    </div>

                                    <div className="mt-3 space-y-1">
                                        {ui.benefits.slice(0, 2).map((benefit, idx) => (
                                            <div
                                                key={idx}
                                                className="flex.items-start gap-1 text-xs text-gray-600"
                                            >
                                                <CheckCircle className="h-3 w-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                                                <span className="line-clamp-1">{benefit}</span>
                                            </div>
                                        ))}
                                        {ui.benefits.length > 2 && (
                                            <div className="text-xs text-gray-500 italic">
                                                +{ui.benefits.length - 2} ещё...
                                            </div>
                                        )}
                                    </div>

                                    {isCurrentStatus && (
                                        <div className="absolute -top-1 -right-1">
                                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
