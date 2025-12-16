import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, Coins, Gift, Loader2, RefreshCw } from 'lucide-react';
import { useGetMyAccountsQuery } from '@/store/api/domains';
import { formatBalance, getAccountTypeName, parseBalance } from '@/utils/ledger/normalize';
import { Link } from 'react-router-dom';

/**
 * AccountsOverview - Обзор всех счетов пользователя
 *
 * Отображает 3 основных счёта:
 * 1. cash_rub (RUB) - рублёвый счёт для выводов
 * 2. pv (PV) - Personal Volume (личный объём для начислений)
 * 3. vwc (VWC) - VitaWin Coin (внутренняя валюта)
 *
 * Фичи:
 * - Карточки с балансами
 * - Иконки для каждого типа счёта
 * - Цветовая индикация
 * - Ссылка на историю транзакций
 */
const AccountsOverview = () => {
  const { data: accounts = [], isLoading, isFetching, refetch } = useGetMyAccountsQuery();

  // Находим счета по типу
  const cashAccount = accounts.find((acc) => acc.type === 'cash_rub');
  const pvAccount = accounts.find((acc) => acc.type === 'pv');
  const vwcAccount = accounts.find((acc) => acc.type === 'vwc');

  // Общий баланс в рублях (для display)
  const totalRub = cashAccount ? parseBalance(cashAccount.balance) : 0;

  if (isLoading && !isFetching) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Мои счета</h2>
          <p className="text-muted-foreground">
            Обзор всех ваших счетов и балансов
          </p>
        </div>

        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* Карточки счетов */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Рублёвый счёт */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <Badge>RUB</Badge>
            </div>
            <CardTitle className="mt-4">Рублёвый счёт</CardTitle>
            <CardDescription>{getAccountTypeName('cash_rub')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {cashAccount ? formatBalance(cashAccount.balance, 'RUB') : '0.00 ₽'}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Доступно для вывода
            </p>
          </CardContent>
        </Card>

        {/* PV счёт */}
        <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <Badge variant="outline" className="border-blue-600 text-blue-600">
                PV
              </Badge>
            </div>
            <CardTitle className="mt-4">Personal Volume</CardTitle>
            <CardDescription>{getAccountTypeName('pv')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {pvAccount ? formatBalance(pvAccount.balance, 'PV') : '0 PV'}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Личный объём покупок
            </p>
          </CardContent>
        </Card>

        {/* VWC счёт */}
        <Card className="border-2 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Coins className="h-6 w-6 text-amber-600" />
              </div>
              <Badge variant="outline" className="border-amber-600 text-amber-600">
                VWC
              </Badge>
            </div>
            <CardTitle className="mt-4">VitaWin Coin</CardTitle>
            <CardDescription>{getAccountTypeName('vwc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {vwcAccount ? formatBalance(vwcAccount.balance, 'VWC') : '0.00 VWC'}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Внутренняя валюта
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Информационная карточка */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            О ваших счетах
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Рублёвый счёт (RUB)</h4>
            <p className="text-sm text-muted-foreground">
              Основной счёт для вывода средств. На него начисляются реферальные бонусы,
              сетевые начисления и кэшбек. Вывод доступен в любое время.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Personal Volume (PV)</h4>
            <p className="text-sm text-muted-foreground">
              Личный объём покупок. Начисляется за каждый заказ и используется для
              расчёта вашего ранга в MLM системе. Не подлежит выводу.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">VitaWin Coin (VWC)</h4>
            <p className="text-sm text-muted-foreground">
              Внутренняя валюта проекта. Может использоваться для специальных акций,
              программ лояльности и будущих функций.
            </p>
          </div>

          <div className="pt-4 border-t">
            <Button asChild className="w-full">
              <Link to="/account/transactions">
                Посмотреть историю транзакций
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountsOverview;
