import { Award, Info, Crown, Star, CreditCard, MapPin, Users } from "lucide-react";
import { useMemo, useState } from "react";
import BalanceSection from "./BalanceSection";
import StatusBenefitsModal from "./StatusBenefitsModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores";
import { useGetMyStatsQuery } from "@/store/api/domains";
import { MLM_STATUS_CONFIG, MLM_STATUS_ORDER, mapMlmStatus, MlmStatusKey } from "../../constants/mlmStatuses";

const AccountOverview = () => {
    const user = useAuthStore((s) => s.user);
    const { t } = useLanguage();
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

    // Полная статистика пользователя (включает MLM сеть, earnings, volumes)
    const { data: stats } = useGetMyStatsQuery(undefined, {
        skip: !user?.id,
    });

    // Реферальная информация из stats
    const referral = useMemo(
        () => ({
            code: stats?.referralCode ?? "",
            totalReferrals: stats?.network.totalReferrals ?? 0,
            directReferrals: stats?.network.directReferrals ?? 0,
            totalEarningsRub: stats?.earnings.totalEarned ?? 0,
            referralBonuses: stats?.earnings.referralBonuses ?? 0,
            levelBonuses: stats?.earnings.levelBonuses ?? 0,
        }),
        [stats]
    );

    // Групповой объём из реальных данных
    const networkStats = useMemo(() => {
        if (!stats) {
            return {
                userBonus: 0,
                networkParticipants: 0,
                totalGroupVolume: 0,
            };
        }
        return {
            userBonus: stats.earnings.totalEarned,
            networkParticipants: stats.network.totalReferrals,
            totalGroupVolume: stats.groupVolume.totalPV,
        };
    }, [stats]);

    // 🔹 MLM статус пользователя в терминах нашей конфигурации
    const currentStatusKey: MlmStatusKey = mapMlmStatus(user?.mlmStatus);
    const currentStatusConfig = MLM_STATUS_CONFIG[currentStatusKey];

    // Следующий статус с точки зрения иерархии
    const nextStatusKey: MlmStatusKey | null = (() => {
        const idx = MLM_STATUS_ORDER.indexOf(currentStatusKey);
        if (idx === -1 || idx >= MLM_STATUS_ORDER.length - 1) return null;
        return MLM_STATUS_ORDER[idx + 1];
    })();

    // ✅ Статус пользователя на основе реальных данных из API
    const userStats = {
        currentStatus: currentStatusConfig.uiName,
        nextStatus: nextStatusKey ? MLM_STATUS_CONFIG[nextStatusKey].uiName : currentStatusConfig.uiName,
        totalPurchases: stats?.personalVolume.ordersCount ?? 0,
        totalSpent: stats?.personalVolume.totalAmount ?? 0,
        referralsCount: referral.directReferrals,
        personalVolume: stats?.personalVolume.totalPV ?? 0,
    };

    // Конфиг уровней для отображения
    const statusLevels = [
        {
            key: "standard" as const,
            name: MLM_STATUS_CONFIG.standard.uiName,
            alias: MLM_STATUS_CONFIG.standard.alias,
            bgColor: "bg-gray-100",
            color: "text-gray-600",
            icon: <Star className="h-5 w-5" />,
            requirements: {
                activationPrice: MLM_STATUS_CONFIG.standard.activationPrice,
                personalVolume: MLM_STATUS_CONFIG.standard.personalVolume,
                referrals: 0,
                amount: 0,
            },
            benefits: ["Покупка со скидкой", "Кэшбек VWC 5%", "Реферальная скидка 10%"],
            restrictedBenefits: [
                "Участие в распределении сети",
                "Реферальные бонусы L1-L15",
                "FastStart бонус",
                "Infinity бонус",
                "Network Fund",
            ],
            description: "Обычный покупатель. Базовые преимущества без участия в распределении сети.",
        },
        {
            key: "partner" as const,
            name: MLM_STATUS_CONFIG.partner.uiName,
            alias: MLM_STATUS_CONFIG.partner.alias,
            bgColor: "bg-emerald-100",
            color: "text-emerald-600",
            icon: <Award className="h-5 w-5" />,
            requirements: {
                activationPrice: MLM_STATUS_CONFIG.partner.activationPrice,
                personalVolume: MLM_STATUS_CONFIG.partner.personalVolume,
                referrals: 0,
                amount: 0,
            },
            benefits: [
                "Все преимущества покупателя",
                "Реферальные бонусы L1-L15",
                "FastStart бонус",
                "Infinity бонус",
                "Участие в Network Fund (50%)",
                "Вывод бонусов",
            ],
            restrictedBenefits: [
                "Option3 бонус",
                "Freedom Shares",
                "VitaWin PRO Club",
                "Приоритетная поддержка",
            ],
            description: "Партнер системы. Участвует в распределении сети и получает реферальные бонусы.",
        },
        {
            key: "partner_pro" as const,
            name: MLM_STATUS_CONFIG.partner_pro.uiName,
            alias: MLM_STATUS_CONFIG.partner_pro.alias,
            bgColor: "bg-purple-100",
            color: "text-purple-600",
            icon: <Crown className="h-5 w-5" />,
            requirements: {
                activationPrice: MLM_STATUS_CONFIG.partner_pro.activationPrice,
                personalVolume: MLM_STATUS_CONFIG.partner_pro.personalVolume,
                referrals: 0,
                amount: 0,
            },
            benefits: [
                "Все преимущества партнёра",
                "Повышенные проценты",
                "Option3 бонус (дополнительный % с сети)",
                "Freedom Shares (участие в пуле)",
                "VitaWin PRO Club",
                "Приоритетная поддержка",
                "Доступ к стратегическим сессиям",
                "Возможность апгрейда до 5 недель",
            ],
            restrictedBenefits: [],
            description: "PRO партнер. Максимальные привилегии и все доступные бонусы компании.",
        },
    ];

    const getCurrentStatusIndex = () =>
        statusLevels.findIndex((level) => level.key === currentStatusKey);

    const getProgressToNextLevel = () => {
        const currentIndex = getCurrentStatusIndex();
        if (currentIndex === -1 || currentIndex >= statusLevels.length - 1) return 100;
        const nextLevel = statusLevels[currentIndex + 1];

        if (nextLevel.requirements.personalVolume <= 0) return 100;

        return Math.min(
            (userStats.personalVolume / nextLevel.requirements.personalVolume) * 100,
            100
        );
    };

    return (
        <div className="space-y-6">
            {/* Balance Section */}
            <BalanceSection />

            {/* Status Levels */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-medium flex items-center justify-between">
                        <div className="flex items-center">
                            <Award className="h-5 w-5 mr-2 text-emerald-500" />
                            Статусы участников
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsStatusModalOpen(true)}
                            className="flex items-center space-x-1 text-[#c2080e]"
                        >
                            <Info className="h-4 w-4" />
                            <span>Сравнить статусы</span>
                        </Button>
                    </CardTitle>
                    <CardDescription>Ваши достижения и цели для повышения статуса</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {statusLevels.map((level, index) => {
                        const isCurrentLevel = level.key === currentStatusKey;
                        const currentIndex = getCurrentStatusIndex();
                        const isAchieved = currentIndex !== -1 && currentIndex >= index;

                        return (
                            <div
                                key={level.key}
                                className={`border rounded-lg transition-all ${
                                    isCurrentLevel
                                        ? "border-emerald-500 bg-emerald-50 p-4"
                                        : isAchieved
                                            ? `${level.bgColor} border-emerald-300 p-4`
                                            : "border-gray-200 bg-white p-4"
                                } ${level.key === "partner_pro" ? "p-6" : "p-4"}`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-full ${level.bgColor} border`}>
                                            <div className={level.color}>{level.icon}</div>
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2 mb-1">
                                                <h3
                                                    className={`font-semibold ${
                                                        level.key === "partner_pro" ? "text-xl" : "text-lg"
                                                    }`}
                                                >
                                                    {level.alias || level.name}
                                                </h3>
                                                {level.key === "partner_pro" && (
                                                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                                                        МАКСИМУМ
                                                    </span>
                                                )}
                                                {isCurrentLevel && level.key !== "partner_pro" && (
                                                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full font-medium">
                                                        Текущий
                                                    </span>
                                                )}
                                                {isAchieved &&
                                                    !isCurrentLevel &&
                                                    level.key !== "partner_pro" && (
                                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                                                            Достигнут
                                                        </span>
                                                    )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* two columns */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Requirements */}
                                    <div className="space-y-2">
                                        <div className="font-medium text-sm text-gray-700 mb-2">
                                            {level.key === "partner_pro"
                                                ? "Квалификация Partner PRO:"
                                                : "Требования:"}
                                        </div>
                                        <div className="space-y-1 text-sm text-gray-600">
                                            {level.requirements.personalVolume > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span>• Личный объем:</span>
                                                    <span
                                                        className={`font-medium ${
                                                            level.key === "partner_pro"
                                                                ? "text-purple-600 font-bold"
                                                                : ""
                                                        }`}
                                                    >
                                                        {level.requirements.personalVolume} PV
                                                    </span>
                                                </div>
                                            )}
                                            {level.requirements.referrals > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span>• Партнеры:</span>
                                                    <span className="font-medium">
                                                        {level.requirements.referrals}
                                                    </span>
                                                </div>
                                            )}
                                            {level.requirements.amount > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span>• Оборот (ЛО):</span>
                                                    <span className="font-medium">
                                                        {level.requirements.amount.toLocaleString()} ₽
                                                    </span>
                                                </div>
                                            )}
                                            {level.key === "standard" && (
                                                <div className="text-xs text-gray-500 italic">
                                                    Без дополнительных требований
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Benefits */}
                                    <div className="space-y-2">
                                        <div className="font-medium text-sm text-gray-700 mb-2">
                                            Преимущества:
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            {level.key === "partner_pro" ? (
                                                <div className="grid grid-cols-1 gap-1">
                                                    {level.benefits.map((benefit, i) => (
                                                        <div key={i} className="flex items-start">
                                                            <span className="text-emerald-500 mr-2 text-xs font-bold">
                                                                ✓
                                                            </span>
                                                            <span className="text-gray-700 text-xs font-medium">
                                                                {benefit}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <>
                                                    {level.benefits.slice(0, 5).map((benefit, i) => (
                                                        <div key={i} className="flex items-start">
                                                            <span className="text-emerald-500 mr-1 text-xs">
                                                                ✓
                                                            </span>
                                                            <span className="text-gray-600 text-xs">
                                                                {benefit}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {level.benefits.length > 5 && (
                                                        <div className="text-xs text-gray-500 mt-2">
                                                            +{level.benefits.length - 5} дополнительных
                                                            преимуществ
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {level.restrictedBenefits &&
                                            level.restrictedBenefits.length > 0 &&
                                            level.key !== "partner_pro" && (
                                                <div className="mt-3 pt-2 border-t border-gray-200">
                                                    <div className="font-medium text-sm text-gray-500 mb-2">
                                                        Недоступно:
                                                    </div>
                                                    <div className="space-y-1 text-sm">
                                                        {level.restrictedBenefits
                                                            .slice(0, 3)
                                                            .map((benefit, i) => (
                                                                <div
                                                                    key={i}
                                                                    className="flex items-start"
                                                                >
                                                                    <span className="text-gray-400 mr-1 text-xs">
                                                                        ✗
                                                                    </span>
                                                                    <span className="text-gray-400 text-xs">
                                                                        {benefit}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        {level.restrictedBenefits.length > 3 && (
                                                            <div className="text-xs text-gray-400 mt-1">
                                                                +
                                                                {level.restrictedBenefits.length - 3}{" "}
                                                                ограничений
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                </div>

                                {/* Progress for current level */}
                                {isCurrentLevel && index < statusLevels.length - 1 && (
                                    <div className="mt-4 pt-4 border-t border-emerald-200">
                                        <div className="text-sm font-medium text-emerald-700 mb-3">
                                            Прогресс до {statusLevels[index + 1].name}:
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 text-xs">
                                            <div>
                                                <div className="flex justify-between mb-1 text-gray-600">
                                                    <span>Личный объем (ЛО)</span>
                                                    <span className="font-medium">
                                                        {userStats.personalVolume} PV/
                                                        {
                                                            statusLevels[index + 1].requirements
                                                                .personalVolume
                                                        }{" "}
                                                        PV
                                                    </span>
                                                </div>
                                                <Progress
                                                    value={Math.min(
                                                        (userStats.personalVolume /
                                                            statusLevels[index + 1].requirements
                                                                .personalVolume) *
                                                        100,
                                                        100
                                                    )}
                                                    className="h-2"
                                                />
                                            </div>
                                            {statusLevels[index + 1].requirements.referrals > 0 && (
                                                <div>
                                                    <div className="flex justify-between mb-1 text-gray-600">
                                                        <span>Рефералы</span>
                                                        <span className="font-medium">
                                                            {userStats.referralsCount}/
                                                            {
                                                                statusLevels[index + 1].requirements
                                                                    .referrals
                                                            }
                                                        </span>
                                                    </div>
                                                    <Progress
                                                        value={Math.min(
                                                            (userStats.referralsCount /
                                                                statusLevels[index + 1].requirements
                                                                    .referrals) *
                                                            100,
                                                            100
                                                        )}
                                                        className="h-2"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Quick Access */}
            <h2 className="text-xl font-semibold mt-8 mb-4">{t("quickAccess")}</h2>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                <QuickAccessCard
                    icon={<CreditCard className="h-6 w-6 mb-2 text-blue-500" />}
                    title={t("paymentMethods")}
                    description={t("manageCards")}
                    linkTo="#payment"
                />
                <QuickAccessCard
                    icon={<MapPin className="h-6 w-6 mb-2 text-red-500" />}
                    title={t("addresses")}
                    description={t("deliveryLocations")}
                    linkTo="#delivery"
                />
                <QuickAccessCard
                    icon={<Users className="h-6 w-6 mb-2 text-purple-500" />}
                    title={t("referralProgram")}
                    description={t("inviteFriends")}
                    linkTo="#referral"
                />
                <QuickAccessCard
                    icon={<Award className="h-6 w-6 mb-2 text-emerald-500" />}
                    title={t("rewards")}
                    description={t("viewBenefits")}
                    linkTo="#"
                />
            </div>

            {/* Modal */}
            <StatusBenefitsModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                statusLevels={statusLevels}
            />
        </div>
    );
};

const QuickAccessCard = ({
                             icon,
                             title,
                             description,
                             linkTo,
                         }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    linkTo: string;
}) => (
    <Link to={linkTo}>
        <Card className="hover:border-emerald-500 transition-all duration-200 h-full">
            <CardContent className="flex flex-col items-center justify-center text-center p-6">
                {icon}
                <h3 className="font-medium">{title}</h3>
                <p className="text-xs text-gray-500 mt-1">{description}</p>
            </CardContent>
        </Card>
    </Link>
);

export default AccountOverview;
