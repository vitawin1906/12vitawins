import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, Filter, Loader2, Search } from 'lucide-react';
import { useGetMyTransactionsQuery } from '@/store/api/domains';
import { formatAmount, getOpTypeName, getOpTypeColor } from '@/utils/ledger/normalize';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { LedgerPostingView } from '@/types/ledger';

/**
 * TransactionHistory - История транзакций пользователя
 *
 * Отображает все операции по счетам:
 * - Начисления (заказы, бонусы, реферальные)
 * - Списания (оплаты, выводы)
 * - Возвраты и корректировки
 *
 * Фичи:
 * - Фильтрация по типу операции и валюте
 * - Поиск по memo и operationId
 * - Пагинация (20 записей на страницу)
 * - Цветовая индикация (зелёный/красный/синий)
 */
const TransactionHistory = () => {
  const [page, setPage] = useState(0);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCurrency, setFilterCurrency] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const limit = 20;
  const offset = page * limit;

  // Загрузка транзакций
  const { data, isLoading, isFetching, refetch } = useGetMyTransactionsQuery({
    limit,
    offset,
  });

  const transactions = data?.transactions || [];
  const pagination = data?.pagination || { limit, offset };

  // Фильтрация транзакций на клиенте
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Фильтр по типу операции
    if (filterType !== 'all') {
      filtered = filtered.filter((t) => t.opType === filterType);
    }

    // Фильтр по валюте
    if (filterCurrency !== 'all') {
      filtered = filtered.filter((t) => t.currency === filterCurrency);
    }

    // Поиск по memo и operationId
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.memo?.toLowerCase().includes(term) ||
          t.operationId?.toLowerCase().includes(term) ||
          t.orderId?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [transactions, filterType, filterCurrency, searchTerm]);

  // Уникальные типы операций для фильтра
  const uniqueOpTypes = useMemo(() => {
    const types = new Set(transactions.map((t) => t.opType));
    return Array.from(types);
  }, [transactions]);

  // Иконка и цвет для типа операции
  const getTransactionIcon = (opType: string) => {
    const color = getOpTypeColor(opType);

    if (color === 'green') {
      return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
    } else if (color === 'red') {
      return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
    }

    return <ArrowUpCircle className="h-4 w-4 text-blue-600" />;
  };

  // Badge цвет для типа операции
  const getBadgeVariant = (opType: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const color = getOpTypeColor(opType);

    if (color === 'green') return 'default';
    if (color === 'red') return 'destructive';
    if (color === 'blue') return 'secondary';
    return 'outline';
  };

  // Пагинация
  const canGoPrev = page > 0;
  const canGoNext = transactions.length === limit; // Если получили полный набор, значит есть ещё данные

  const handlePrevPage = () => {
    if (canGoPrev) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (canGoNext) {
      setPage(page + 1);
    }
  };

  // Форматирование даты
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy, HH:mm', { locale: ru });
    } catch {
      return dateStr;
    }
  };

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
    <div className="space-y-4">
      {/* Заголовок */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            История транзакций
          </CardTitle>
          <CardDescription>
            Все операции по вашим счетам: начисления, списания, бонусы
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Фильтры */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Поиск */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Фильтр по типу */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Тип операции" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                {uniqueOpTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {getOpTypeName(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Фильтр по валюте */}
            <Select value={filterCurrency} onValueChange={setFilterCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Валюта" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все валюты</SelectItem>
                <SelectItem value="RUB">RUB (₽)</SelectItem>
                <SelectItem value="VWC">VWC</SelectItem>
                <SelectItem value="PV">PV</SelectItem>
              </SelectContent>
            </Select>

            {/* Кнопка обновления */}
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Обновить'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Таблица транзакций */}
      <Card>
        <CardContent className="pt-6">
          {filteredTransactions.length === 0 ? (
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
                    <TableHead>Описание</TableHead>
                    <TableHead className="text-right">ID операции</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction: LedgerPostingView) => (
                    <TableRow key={transaction.id}>
                      {/* Дата */}
                      <TableCell className="whitespace-nowrap">
                        {formatDate(transaction.createdAt)}
                      </TableCell>

                      {/* Тип операции */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.opType)}
                          <Badge variant={getBadgeVariant(transaction.opType)}>
                            {getOpTypeName(transaction.opType)}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Сумма */}
                      <TableCell className="font-mono font-semibold">
                        {formatAmount(transaction.amount, transaction.currency)}
                      </TableCell>

                      {/* Валюта */}
                      <TableCell>
                        <Badge variant="outline">{transaction.currency}</Badge>
                      </TableCell>

                      {/* Описание */}
                      <TableCell className="max-w-xs truncate">
                        {transaction.memo || (
                          <span className="text-muted-foreground italic">Без описания</span>
                        )}
                      </TableCell>

                      {/* ID операции */}
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {transaction.operationId?.slice(0, 8)}...
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Пагинация */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Показано {filteredTransactions.length} из {transactions.length} транзакций
                  {searchTerm || filterType !== 'all' || filterCurrency !== 'all'
                    ? ' (отфильтровано)'
                    : ''}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={!canGoPrev || isFetching}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Назад
                  </Button>

                  <div className="text-sm text-muted-foreground">
                    Страница {page + 1}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!canGoNext || isFetching}
                  >
                    Далее
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionHistory;
