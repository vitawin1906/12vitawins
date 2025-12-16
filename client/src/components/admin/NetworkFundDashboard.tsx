import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useGetNetworkFundBalanceQuery,
  useGetNetworkFundStatsQuery,
  useAllocateFromOrderMutation,
  useDistributeBonusesMutation,
  useWithdrawFromFundMutation,
} from '@/store/api/domains/networkFundApi';

export function NetworkFundDashboard() {
  const { toast } = useToast();
  const [orderId, setOrderId] = useState('');
  const [withdrawUserId, setWithdrawUserId] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');

  const { data: balance, isLoading: loadingBalance, refetch: refetchBalance } = useGetNetworkFundBalanceQuery();
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useGetNetworkFundStatsQuery();

  const [allocate, { isLoading: allocating }] = useAllocateFromOrderMutation();
  const [distribute, { isLoading: distributing }] = useDistributeBonusesMutation();
  const [withdraw, { isLoading: withdrawing }] = useWithdrawFromFundMutation();

  const handleAllocate = async () => {
    if (!orderId.trim()) {
      toast({ title: 'Ошибка', description: 'Укажите ID заказа', variant: 'destructive' });
      return;
    }

    try {
      await allocate({ orderId }).unwrap();
      toast({ title: 'Успешно', description: 'Средства начислены в фонд' });
      setOrderId('');
      refetchBalance();
      refetchStats();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error?.data?.message || 'Не удалось начислить средства',
        variant: 'destructive',
      });
    }
  };

  const handleDistribute = async () => {
    if (!orderId.trim()) {
      toast({ title: 'Ошибка', description: 'Укажите ID заказа', variant: 'destructive' });
      return;
    }

    try {
      const result = await distribute({ orderId }).unwrap();
      toast({
        title: 'Успешно',
        description: `Распределено ${result.allocation.totalFundRub} ₽`,
      });
      setOrderId('');
      refetchBalance();
      refetchStats();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error?.data?.message || 'Не удалось распределить бонусы',
        variant: 'destructive',
      });
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawUserId.trim() || !withdrawAmount || !withdrawReason.trim()) {
      toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    try {
      await withdraw({
        userId: withdrawUserId,
        amountRub: parseFloat(withdrawAmount),
        reason: withdrawReason,
      }).unwrap();
      toast({ title: 'Успешно', description: 'Вывод из фонда выполнен' });
      setWithdrawUserId('');
      setWithdrawAmount('');
      setWithdrawReason('');
      refetchBalance();
      refetchStats();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error?.data?.message || 'Не удалось выполнить вывод',
        variant: 'destructive',
      });
    }
  };

  if (loadingBalance || loadingStats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Основная статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Текущий баланс</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <span className="text-2xl font-bold">{balance?.balance || '0'} ₽</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Всего начислено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats?.stats.totalAllocated || '0'} ₽</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Распределено</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{stats?.stats.totalDistributed || '0'} ₽</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ожидает распределения</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <span className="text-2xl font-bold">{stats?.stats.pendingDistribution || '0'} ₽</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Операции */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Начислить из заказа */}
        <Card>
          <CardHeader>
            <CardTitle>Начислить из заказа</CardTitle>
            <CardDescription>Начислить средства в фонд из конкретного заказа</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>ID заказа</Label>
              <Input
                placeholder="UUID заказа"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
            </div>
            <Button onClick={handleAllocate} disabled={allocating} className="w-full">
              {allocating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Начислить в фонд
            </Button>
          </CardContent>
        </Card>

        {/* Распределить бонусы */}
        <Card>
          <CardHeader>
            <CardTitle>Распределить бонусы</CardTitle>
            <CardDescription>Распределить бонусы из фонда по структуре</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>ID заказа</Label>
              <Input
                placeholder="UUID заказа"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
            </div>
            <Button onClick={handleDistribute} disabled={distributing} className="w-full">
              {distributing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Распределить бонусы
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Вывод средств */}
      <Card>
        <CardHeader>
          <CardTitle>Вывод средств из фонда</CardTitle>
          <CardDescription>Ручной вывод средств пользователю</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>ID пользователя</Label>
              <Input
                placeholder="UUID пользователя"
                value={withdrawUserId}
                onChange={(e) => setWithdrawUserId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Сумма (₽)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Причина</Label>
              <Input
                placeholder="Причина вывода"
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleWithdraw} disabled={withdrawing} variant="destructive" className="w-full">
            {withdrawing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Выполнить вывод
          </Button>
        </CardContent>
      </Card>

      {/* Информация */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Важно:</strong> Все операции с сетевым фондом логируются в системе. Распределение бонусов происходит автоматически при оплате заказа, ручное распределение следует использовать только для корректировок.
        </AlertDescription>
      </Alert>
    </div>
  );
}
