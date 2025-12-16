import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    useBatchUpgradePartnersMutation,
    useUpgradeUserToPartnerMutation,
} from '@/store/api/domains/partnerUpgradeApi';
import { useGetAllUsersQuery } from '@/store/api/domains/usersApi';

export function PartnerUpgradeDashboard() {
    const { toast } = useToast();
    const [userId, setUserId] = useState('');
    const [batchLimit, setBatchLimit] = useState('100');
    // 👇 вернули any, чтобы не конфликтовать с BatchUpgradeResponse из API
    const [upgradeResult, setUpgradeResult] = useState<any>(null);

    const { data: users, isLoading: loadingUsers } = useGetAllUsersQuery();
    const [batchUpgrade, { isLoading: batchUpgrading }] = useBatchUpgradePartnersMutation();
    const [upgradeUser, { isLoading: upgrading }] = useUpgradeUserToPartnerMutation();

    const customers = users?.filter(u => u.mlmStatus === 'customer') || [];
    const partners =
        users?.filter(u => u.mlmStatus === 'partner' || u.mlmStatus === 'partner_pro') || [];

    const handleBatchUpgrade = async () => {
        const limitNumber = Number(batchLimit) || 100;

        try {
            const result = await batchUpgrade({ limit: limitNumber }).unwrap();
            // result у тебя типизирован как BatchUpgradeResponse
            // там почти наверняка есть поле result с нужной структурой
            const payload = (result as any).result ?? result;

            setUpgradeResult(payload);

            toast({
                title: 'Batch upgrade выполнен',
                description: `Обработано: ${payload.processed}, Повышено: ${payload.upgraded}`,
            });
        } catch (error: any) {
            toast({
                title: 'Ошибка',
                description: error?.data?.message || 'Не удалось выполнить batch upgrade',
                variant: 'destructive',
            });
        }
    };

    const handleUpgradeUser = async () => {
        const trimmed = userId.trim();
        if (!trimmed) {
            toast({ title: 'Ошибка', description: 'Укажите ID пользователя', variant: 'destructive' });
            return;
        }

        try {
            // 🔥 ВАЖНО: useUpgradeUserToPartnerMutation ожидает string, а не { userId }
            const result = await upgradeUser(trimmed).unwrap();

            toast({
                title: result.upgraded ? 'Успешно' : 'Не выполнено',
                description: result.message,
                variant: result.upgraded ? 'default' : 'destructive',
            });
            setUserId('');
        } catch (error: any) {
            toast({
                title: 'Ошибка',
                description: error?.data?.message || 'Не удалось выполнить upgrade',
                variant: 'destructive',
            });
        }
    };

    if (loadingUsers) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Всего пользователей</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-600" />
                            <span className="text-2xl font-bold">{users?.length || 0}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Customers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-600" />
                            <span className="text-2xl font-bold">{customers.length}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Partners</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                            <span className="text-2xl font-bold">{partners.length}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Batch Upgrade */}
            <Card>
                <CardHeader>
                    <CardTitle>Batch Upgrade</CardTitle>
                    <CardDescription>
                        Проверить всех customers на возможность автоповышения до Partner
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Условия для автоповышения:</strong> Минимум 2 оплаченных заказа на сумму от
                            10,000 ₽
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <Label>Лимит обработки (макс. пользователей за раз)</Label>
                        <Input
                            type="number"
                            value={batchLimit}
                            onChange={(e) => setBatchLimit(e.target.value)}
                            min="1"
                            max="1000"
                        />
                    </div>

                    <Button
                        onClick={handleBatchUpgrade}
                        disabled={batchUpgrading}
                        className="w-full"
                        size="lg"
                    >
                        {batchUpgrading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <TrendingUp className="h-4 w-4 mr-2" />
                        )}
                        Запустить Batch Upgrade
                    </Button>

                    {/* Результаты Batch Upgrade */}
                    {upgradeResult && (
                        <div className="mt-4 p-4 border rounded-lg space-y-3">
                            <h4 className="font-semibold">Результаты обработки:</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-blue-600">{upgradeResult.processed}</p>
                                    <p className="text-xs text-gray-600">Обработано</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-emerald-600">{upgradeResult.upgraded}</p>
                                    <p className="text-xs text-gray-600">Повышено</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-600">{upgradeResult.skipped}</p>
                                    <p className="text-xs text-gray-600">Пропущено</p>
                                </div>
                            </div>

                            {upgradeResult.upgradeDetails && upgradeResult.upgradeDetails.length > 0 && (
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {upgradeResult.upgradeDetails.map((detail: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-2 border-b text-sm"
                                        >
                      <span className="font-mono text-xs">
                        {detail.userId ? detail.userId.slice(0, 8) : 'unknown'}...
                      </span>
                                            {detail.upgraded ? (
                                                <Badge variant="default" className="gap-1">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Повышен
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="gap-1">
                                                    <XCircle className="h-3 w-3" />
                                                    {detail.reason || 'Не eligible'}
                                                </Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Upgrade конкретного пользователя */}
            <Card>
                <CardHeader>
                    <CardTitle>Upgrade конкретного пользователя</CardTitle>
                    <CardDescription>
                        Проверить и повысить конкретного пользователя до Partner вручную
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>ID пользователя (UUID)</Label>
                        <Input
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                        />
                    </div>

                    <Button onClick={handleUpgradeUser} disabled={upgrading} className="w-full">
                        {upgrading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Проверить и повысить
                    </Button>
                </CardContent>
            </Card>

            {/* Customers список (топ 10 для превью) */}
            {customers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Текущие Customers (топ 10)</CardTitle>
                        <CardDescription>Пользователи со статусом Customer</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {customers.slice(0, 10).map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <div>
                                        <p className="font-medium">{user.firstName || user.email}</p>
                                        <p className="text-xs text-gray-600 font-mono">{user.id}</p>
                                    </div>
                                    <Badge variant="outline">{user.mlmStatus}</Badge>
                                </div>
                            ))}
                            {customers.length > 10 && (
                                <p className="text-sm text-gray-600 text-center">
                                    И ещё {customers.length - 10} customers...
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
