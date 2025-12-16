import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, Activity, Search, Loader2, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useGetAdminAllAccountsQuery,
  useGetAdminAllTransactionsQuery,
} from '@/store/api/domains';
import { formatBalance, formatAmount, getOpTypeName, getAccountTypeName } from '@/utils/ledger/normalize';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * LedgerManagement - Админ панель управления финансовой системой
 *
 * Отображает:
 * 1. Все счета в системе (пользовательские + системные)
 * 2. Все транзакции в системе
 * 3. Статистику по счетам
 *
 * Фичи:
 * - Поиск по ownerId, type, currency
 * - Фильтрация по ownerType (user/system)
 * - Пагинация
 * - Детали счетов и транзакций
 */
const LedgerManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [accountsPage, setAccountsPage] = useState(0);
  const [transactionsPage, setTransactionsPage] = useState(0);

  const limit = 20;

  // Загрузка всех счетов
  const {
    data: accountsData,
    isLoading: isLoadingAccounts,
    isFetching: isFetchingAccounts,
  } = useGetAdminAllAccountsQuery({
    limit,
    offset: accountsPage * limit,
  });

  // Загрузка всех транзакций
  const {
    data: transactionsData,
    isLoading: isLoadingTransactions,
    isFetching: isFetchingTransactions,
  } = useGetAdminAllTransactionsQuery({
    limit,
    offset: transactionsPage * limit,
  });

  const accounts = accountsData?.accounts || [];
  const transactions = transactionsData?.transactions || [];

  // Фильтрация счетов
  const filteredAccounts = useMemo(() => {
    if (!searchTerm) return accounts;

    const term = searchTerm.toLowerCase();
    return accounts.filter(
      (acc) =>
        acc.ownerId?.toLowerCase().includes(term) ||
        acc.type.toLowerCase().includes(term) ||
        acc.currency.toLowerCase().includes(term)
    );
  }, [accounts, searchTerm]);

  // Статистика по счетам
  const accountsStats = useMemo(() => {
    const userAccounts = accounts.filter((acc) => acc.ownerType === 'user');
    const systemAccounts = accounts.filter((acc) => acc.ownerType === 'system');

    const totalRub = accounts
      .filter((acc) => acc.currency === 'RUB')
      .reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);

    const totalPv = accounts
      .filter((acc) => acc.currency === 'PV')
      .reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);

    const totalVwc = accounts
      .filter((acc) => acc.currency === 'VWC')
      .reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);

    return {
      total: accounts.length,
      userAccounts: userAccounts.length,
      systemAccounts: systemAccounts.length,
      totalRub,
      totalPv,
      totalVwc,
    };
  }, [accounts]);

  // Пагинация для счетов
  const canGoPrevAccounts = accountsPage > 0;
  const canGoNextAccounts = accounts.length === limit;

  // Пагинация для транзакций
  const canGoPrevTransactions = transactionsPage > 0;
  const canGoNextTransactions = transactions.length === limit;

  // Форматирование даты
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy, HH:mm', { locale: ru });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h2 className="text-3xl font-bold">Ledger - Финансовая система</h2>
        <p className="text-muted-foreground mt-2">
          Управление счетами и транзакциями пользователей
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Всего счетов</CardDescription>
            <CardTitle className="text-3xl">{accountsStats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Пользовательские</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {accountsStats.userAccounts}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Системные</CardDescription>
            <CardTitle className="text-3xl text-amber-600">
              {accountsStats.systemAccounts}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Общий баланс RUB</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">
              {accountsStats.totalRub.toFixed(2)} ₽
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Табы */}
      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">
            <Wallet className="h-4 w-4 mr-2" />
            Счета
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <Activity className="h-4 w-4 mr-2" />
            Транзакции
          </TabsTrigger>
        </TabsList>

        {/* Вкладка: Счета */}
        <TabsContent value="accounts" className="space-y-4">
          {/* Поиск */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по ownerId, type, currency..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Таблица счетов */}
          <Card>
            <CardContent className="pt-6">
              {isLoadingAccounts ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredAccounts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Счета не найдены
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID счёта</TableHead>
                        <TableHead>Владелец</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Валюта</TableHead>
                        <TableHead className="text-right">Баланс</TableHead>
                        <TableHead>Создан</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAccounts.map((account) => (
                        <TableRow key={account.id}>
                          {/* ID */}
                          <TableCell className="font-mono text-xs">
                            {account.id.slice(0, 8)}...
                          </TableCell>

                          {/* Владелец */}
                          <TableCell>
                            {account.ownerType === 'system' ? (
                              <Badge variant="outline" className="border-amber-600 text-amber-600">
                                SYSTEM
                              </Badge>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-blue-600" />
                                <span className="font-mono text-xs">
                                  {account.ownerId?.slice(0, 8)}...
                                </span>
                              </div>
                            )}
                          </TableCell>

                          {/* Тип */}
                          <TableCell>
                            <Badge variant="secondary">
                              {getAccountTypeName(account.type)}
                            </Badge>
                          </TableCell>

                          {/* Валюта */}
                          <TableCell>
                            <Badge>{account.currency}</Badge>
                          </TableCell>

                          {/* Баланс */}
                          <TableCell className="text-right font-mono font-semibold">
                            {formatBalance(account.balance, account.currency as any)}
                          </TableCell>

                          {/* Дата создания */}
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(account.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Пагинация */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Страница {accountsPage + 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAccountsPage(accountsPage - 1)}
                        disabled={!canGoPrevAccounts || isFetchingAccounts}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAccountsPage(accountsPage + 1)}
                        disabled={!canGoNextAccounts || isFetchingAccounts}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка: Транзакции */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {isLoadingTransactions ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Транзакции не найдены
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Дата</TableHead>
                        <TableHead>Тип операции</TableHead>
                        <TableHead>Сумма</TableHead>
                        <TableHead>Валюта</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead>Order ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatDate(txn.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getOpTypeName(txn.opType)}</Badge>
                          </TableCell>
                          <TableCell className="font-mono font-semibold">
                            {formatAmount(txn.amount, txn.currency as any)}
                          </TableCell>
                          <TableCell>
                            <Badge>{txn.currency}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {txn.userId ? `${txn.userId.slice(0, 8)}...` : '-'}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {txn.orderId ? `${txn.orderId.slice(0, 8)}...` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Пагинация */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Страница {transactionsPage + 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTransactionsPage(transactionsPage - 1)}
                        disabled={!canGoPrevTransactions || isFetchingTransactions}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTransactionsPage(transactionsPage + 1)}
                        disabled={!canGoNextTransactions || isFetchingTransactions}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LedgerManagement;
