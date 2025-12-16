import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "../ui/form";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../ui/dialog";
import {
    Wallet,
    Download,
    CheckCircle,
    Clock,
    AlertCircle,
    Coins,
    ShoppingCart,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores";
import {
    useGetMyAccountsQuery,
    useGetMyWithdrawalsQuery,
    // 👇 добавь эту мутацию в RTK Query, если ещё нет
    useCreateWithdrawalMutation,
} from "@/store/api/domains";
import { parseBalance } from "@/utils/ledger/normalize";

interface WithdrawalFormData {
    fullName: string;
    inn: string;
    bik: string;
    accountNumber: string;
    amount: number;
}
export type WithdrawalStatus =
    | 'requested'
    | 'in_review'
    | 'approved'
    | 'rejected'
    | 'paid'
    | 'canceled';


function BalanceSection() {
    const { user } = useAuthStore();
    const { toast } = useToast();

    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // ---- Счета ----
    const { data: accounts = [], isLoading: accountsLoading } =
        useGetMyAccountsQuery(undefined, { skip: !user });

    const {
        data: withdrawals = [],
        isLoading: withdrawalsLoading,
        isError: withdrawalsError,
    } = useGetMyWithdrawalsQuery(
        {},
        { skip: !user }
    );

    const [createWithdrawal, { isLoading: isCreatingWithdrawal }] =
        useCreateWithdrawalMutation();

    const cashAccount = accounts.find((acc) => acc.type === "cash_rub");
    const vwcAccount = accounts.find((acc) => acc.type === "vwc");
    const pvAccount = accounts.find((acc) => acc.type === "pv");
    const referralAccount = accounts.find((acc) => acc.type === "referral");

    const totalEarnings = cashAccount ? parseBalance(cashAccount.balance) : 0;
    const vwcBalance = vwcAccount ? parseBalance(vwcAccount.balance) : 0;
    const pvBalance = pvAccount ? parseInt(pvAccount.balance || "0") : 0;
    const referralBalance = referralAccount ? parseBalance(referralAccount.balance) : 0;

    // ---- Форма заявки на вывод ----
    const form = useForm<WithdrawalFormData>({
        defaultValues: {
            fullName: "",
            inn: "",
            bik: "",
            accountNumber: "",
            amount: 0,
        },
    });

    const onSubmit = async (data: WithdrawalFormData) => {
        if (data.amount < 3500) {
            toast({
                title: "Минимальная сумма 3500 ₽",
                variant: "destructive",
            });
            return;
        }
        if (data.amount > totalEarnings) {
            toast({
                title: "Недостаточно средств",
                description: "Сумма вывода превышает доступный баланс.",
                variant: "destructive",
            });
            return;
        }

        try {
            await createWithdrawal({
                amountRub: data.amount,
                method: "bank_transfer", // любое твоё бизнес-название метода
                destination: {
                    fullName: data.fullName,
                    inn: data.inn,
                    bik: data.bik,
                    accountNumber: data.accountNumber,
                },
                idempotencyKey: `${user?.id || "anon"}-${Date.now()}`, // простой идемпотентный ключ
            }).unwrap();

            toast({
                title: "Заявка на вывод создана",
                description: "Мы обработаем вашу заявку в ближайшее время.",
            });

            setIsDialogOpen(false);
            form.reset();
        } catch (e: any) {
            toast({
                title: "Ошибка при создании заявки",
                description: e?.data?.message || "Попробуйте позже.",
                variant: "destructive",
            });
        }
    };

    const getStatusIcon = (status: WithdrawalStatus) => {
        switch (status) {
            case "paid":
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "approved":
            case "in_review":
            case "requested":
                return <Clock className="h-4 w-4 text-yellow-500" />;
            case "rejected":
            case "canceled":
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status: WithdrawalStatus) => {
        switch (status) {
            case "paid":
                return "bg-green-100 text-green-800";
            case "approved":
            case "in_review":
            case "requested":
                return "bg-yellow-100 text-yellow-800";
            case "rejected":
            case "canceled":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const getStatusText = (status: WithdrawalStatus) => {
        switch (status) {
            case "paid":
                return "Выплачено";
            case "approved":
                return "Одобрено";
            case "in_review":
            case "requested":
                return "В обработке";
            case "rejected":
                return "Отклонено";
            case "canceled":
                return "Отменено";
            default:
                return "Неизвестно";
        }
    };

    return (
        <div className="space-y-6">
            {/* Баланс к выводу */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-medium flex items-center">
                        <Wallet className="h-5 w-5 mr-2 text-emerald-500" />
                        Баланс к выводу
                    </CardTitle>
                    <CardDescription>
                        Управляйте своими доходами и заявками на вывод
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Сумма к выводу */}
                        <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                            <div>
                                <div className="text-3xl font-bold text-emerald-600">
                                    {accountsLoading ? "..." : `${totalEarnings.toFixed(2)} ₽`}
                                </div>
                                <div className="text-sm text-gray-600">
                                    Доступно к выводу (RUB счёт)
                                </div>
                            </div>

                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                        disabled={totalEarnings < 3500}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Вывести средства
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[600px]">
                                    <DialogHeader>
                                        <DialogTitle>Заявка на вывод средств</DialogTitle>
                                        <DialogDescription>
                                            Заполните банковские реквизиты для вывода
                                        </DialogDescription>
                                    </DialogHeader>

                                    <Form {...form}>
                                        <form
                                            onSubmit={form.handleSubmit(onSubmit)}
                                            className="space-y-4"
                                        >
                                            <FormField
                                                control={form.control}
                                                name="fullName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>ФИО получателя</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                placeholder="Иванов Иван Иванович"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="amount"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Сумма к выводу</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                type="number"
                                                                min={3500}
                                                                max={totalEarnings}
                                                                placeholder="3500.00"
                                                                onChange={(e) =>
                                                                    field.onChange(Number(e.target.value))
                                                                }
                                                            />
                                                        </FormControl>
                                                        <FormDescription>
                                                            Минимальная сумма вывода 3500 руб.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="inn"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>ИНН</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    {...field}
                                                                    placeholder="123456789012"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="bik"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>БИК банка</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    {...field}
                                                                    placeholder="044525225"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name="accountNumber"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Номер счёта</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                placeholder="40817810099910004312"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="flex gap-3 pt-4">
                                                <Button
                                                    type="submit"
                                                    className="bg-emerald-600 hover:bg-emerald-700"
                                                    disabled={isCreatingWithdrawal}
                                                >
                                                    {isCreatingWithdrawal
                                                        ? "Отправка..."
                                                        : "Отправить заявку"}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setIsDialogOpen(false)}
                                                >
                                                    Отмена
                                                </Button>
                                            </div>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {totalEarnings < 3500 && (
                            <div className="text-sm text-gray-500 text-center">
                                Минимальная сумма для вывода: 3500 ₽
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* VWC, PV, и Referral */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* VWC */}
                <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="relative bg-gradient-to-br from-yellow-50 to-amber-50 p-4">
                        <div className="absolute top-3 right-3">
                            <Badge className="bg-yellow-500 text-white text-xs">
                                Кэшбек
                            </Badge>
                        </div>
                        <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mb-3">
                            <Coins className="h-6 w-6 text-yellow-600" />
                        </div>
                    </div>

                    <CardContent className="p-4">
                        <div className="space-y-2">
                            <h3 className="font-semibold text-gray-900">
                                VitaWin Coins (VWC)
                            </h3>
                            <div className="text-2xl font-bold text-yellow-600">
                                {accountsLoading ? "..." : `${vwcBalance.toFixed(2)} ₽`}
                            </div>
                            <p className="text-sm text-gray-600">
                                Доступно к использованию при следующей покупке (1 VWC = 1 ₽)
                            </p>
                        </div>

                        <div className="mt-4">
                            <Button
                                size="sm"
                                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                                onClick={() => (window.location.href = "/store")}
                            >
                                <ShoppingCart className="h-4 w-4 mr-1" />
                                К покупкам
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* PV */}
                <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="relative bg-gradient-to-br from-emerald-50 to-green-50 p-4">
                        <div className="absolute top-3 right-3">
                            <Badge className="bg-emerald-500 text-white text-xs">
                                Объём
                            </Badge>
                        </div>
                        <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-lg mb-3">
                            <Wallet className="h-6 w-6 text-emerald-600" />
                        </div>
                    </div>

                    <CardContent className="p-4">
                        <div className="space-y-3">
                            <h3 className="font-semibold text-gray-900">Личный объём (PV)</h3>

                            <div className="text-2xl font-bold text-emerald-600">
                                {accountsLoading ? "..." : `${pvBalance} PV`}
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs text-gray-600">
                                    Личный объём по вашим покупкам и активности.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Referral Bonuses (L1-L15) */}
                <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                        <div className="absolute top-3 right-3">
                            <Badge className="bg-blue-500 text-white text-xs">
                                Бонусы
                            </Badge>
                        </div>
                        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-3">
                            <Wallet className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>

                    <CardContent className="p-4">
                        <div className="space-y-3">
                            <h3 className="font-semibold text-gray-900">Реферальные бонусы</h3>

                            <div className="text-2xl font-bold text-blue-600">
                                {accountsLoading ? "..." : `${referralBalance.toFixed(2)} ₽`}
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs text-gray-600">
                                    Бонусы L1-L15 от покупок вашей партнёрской сети
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* История выводов */}
            <Card>
                <CardHeader>
                    <CardTitle>История выводов</CardTitle>
                    <CardDescription>Все ваши заявки на вывод средств</CardDescription>
                </CardHeader>
                <CardContent>
                    {withdrawalsLoading ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            Загрузка истории выводов...
                        </div>
                    ) : withdrawalsError ? (
                        <div className="text-center py-8 text-red-500 text-sm">
                            Не удалось загрузить историю выводов
                        </div>
                    ) : !withdrawals || withdrawals.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>У вас пока нет заявок на вывод</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {withdrawals.map((withdrawal: any) => {
                                const rawAmount = withdrawal.amountRub ?? withdrawal.amount ?? 0;
                                const amount = Number(rawAmount) || 0;

                                const date =
                                    withdrawal.requestedAt ??
                                    withdrawal.createdAt ??
                                    withdrawal.date;

                                return (
                                    <div
                                        key={withdrawal.id}
                                        className="flex items-center justify-between p-4 border rounded-lg"
                                    >
                                        <div className="flex items-center space-x-4">
                                            {getStatusIcon(withdrawal.status)}
                                            <div>
                                                <div className="font-medium">
                                                    {amount.toLocaleString("ru-RU", {
                                                        minimumFractionDigits: 0,
                                                        maximumFractionDigits: 0,
                                                    })} ₽
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {date
                                                        ? new Date(date).toLocaleDateString("ru-RU")
                                                        : ""}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge className={getStatusColor(withdrawal.status)}>
                                            {getStatusText(withdrawal.status)}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default BalanceSection;
