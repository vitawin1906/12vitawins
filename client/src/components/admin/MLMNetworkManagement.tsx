import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateShortRu } from '@/utils/dateFormat';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Users,
    DollarSign,
    TrendingUp,
    Crown,
    RefreshCw,
    Search,
    Filter,
    Download,
    Network
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGetAdminNetworkUsersQuery } from '@/store/api/domains';
import type { MLMUser } from '@/store/api/domains/mlmApi';
import MLMNetworkVisualization from './MLMNetworkVisualization';

interface NetworkSummary {
    totalUsers: number;
    totalActive: number;
    totalInactive: number;
}

const MLM_STATUS_LABELS: Record<string, string> = {
    active: 'Активен',
    inactive: 'Неактивен',
    suspended: 'Приостановлен',
    pending: 'В ожидании'
};

const MLM_STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    suspended: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800'
};

const MLMNetworkManagement: React.FC = () => {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Fetch all users network stats
    const { data: users = [], isLoading, error, refetch } = useGetAdminNetworkUsersQuery(undefined, {
        pollingInterval: 30000, // Обновляем каждые 30 секунд
    });

    // Вычисляем summary из данных
    const summary: NetworkSummary = useMemo(() => ({
        totalUsers: users.length,
        totalActive: users.filter(u => u.mlmStatus === 'active').length,
        totalInactive: users.filter(u => u.mlmStatus === 'inactive').length,
    }), [users]);

    // Фильтрация и сортировка пользователей
    const filteredAndSortedUsers = useMemo(() => {
        let filtered = users.filter(user => {
            const matchesSearch =
                (user.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (user.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (user.telegramId || '').toString().includes(searchTerm);

            const matchesStatus = statusFilter === 'all' || (user.mlmStatus || 'inactive') === statusFilter;

            return matchesSearch && matchesStatus;
        });

        // Сортировка
        filtered.sort((a, b) => {
            let aValue: any, bValue: any;

            switch (sortBy) {
                case 'name':
                    aValue = a.firstName || '';
                    bValue = b.firstName || '';
                    return sortOrder === 'desc'
                        ? bValue.localeCompare(aValue)
                        : aValue.localeCompare(bValue);
                case 'createdAt':
                    aValue = new Date(a.createdAt).getTime();
                    bValue = new Date(b.createdAt).getTime();
                    break;
                case 'status':
                    aValue = a.mlmStatus || 'inactive';
                    bValue = b.mlmStatus || 'inactive';
                    return sortOrder === 'desc'
                        ? bValue.localeCompare(aValue)
                        : aValue.localeCompare(bValue);
                default:
                    aValue = 0;
                    bValue = 0;
            }

            return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
        });

        return filtered;
    }, [users, searchTerm, statusFilter, sortBy, sortOrder]);


    // Обновление данных
    const handleRefresh = async () => {
        refetch();
        toast({
            title: "Обновление данных",
            description: "Статистика MLM сети обновлена",
        });
    };

    const exportData = () => {
        const csvContent = [
            ['ID', 'Имя', 'Email', 'Telegram ID', 'Статус', 'Ранг', 'Дата регистрации'].join(','),
            ...filteredAndSortedUsers.map(user => [
                user.id,
                `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                user.email || '',
                user.telegramId || '',
                user.mlmStatus || 'inactive',
                user.rank || 'Новичок',
                formatDateShortRu(user.createdAt)
            ].join(','))
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `mlm_statistics_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    if (error) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center text-red-500">
                        Ошибка загрузки статистики MLM сети
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Заголовок и действия */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">MLM Сеть</h2>
                    <p className="text-gray-600">Статистика и управление MLM структурой</p>
                </div>
                <div className="flex space-x-2">
                    <Button onClick={exportData} variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Экспорт
                    </Button>
                    <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Обновить
                    </Button>
                </div>
            </div>

            {/* Статистические карточки */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Всего пользователей</p>
                                <p className="text-3xl font-bold text-gray-900">
                                    {isLoading ? <Skeleton className="h-9 w-20" /> : summary.totalUsers}
                                </p>
                            </div>
                            <Users className="h-10 w-10 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Активные</p>
                                <p className="text-3xl font-bold text-green-600">
                                    {isLoading ? <Skeleton className="h-9 w-20" /> : summary.totalActive}
                                </p>
                            </div>
                            <TrendingUp className="h-10 w-10 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Неактивные</p>
                                <p className="text-3xl font-bold text-gray-600">
                                    {isLoading ? <Skeleton className="h-9 w-20" /> : summary.totalInactive}
                                </p>
                            </div>
                            <DollarSign className="h-10 w-10 text-gray-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Фильтры и поиск */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Поиск по имени, email, Telegram ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Статус" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Все статусы</SelectItem>
                                <SelectItem value="active">Активные</SelectItem>
                                <SelectItem value="inactive">Неактивные</SelectItem>
                                <SelectItem value="suspended">Приостановлены</SelectItem>
                                <SelectItem value="pending">В ожидании</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Сортировка" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="name">По имени</SelectItem>
                                <SelectItem value="createdAt">По дате</SelectItem>
                                <SelectItem value="status">По статусу</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        >
                            {sortOrder === 'desc' ? '↓' : '↑'}
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : filteredAndSortedUsers.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">Пользователи не найдены</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Пользователь</TableHead>
                                        <TableHead>Email / Telegram</TableHead>
                                        <TableHead>Статус</TableHead>
                                        <TableHead>Ранг</TableHead>
                                        <TableHead>Дата регистрации</TableHead>
                                        <TableHead>Действия</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAndSortedUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex-shrink-0">
                                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                                                            {(user.firstName || 'U').charAt(0).toUpperCase()}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">
                                                            {user.firstName || 'Без имени'} {user.lastName || ''}
                                                        </div>
                                                        <div className="text-sm text-gray-500">ID: {user.id}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div>{user.email || '-'}</div>
                                                    {user.telegramId && (
                                                        <div className="text-gray-500">TG: {user.telegramId}</div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={MLM_STATUS_COLORS[user.mlmStatus || 'inactive']}>
                                                    {MLM_STATUS_LABELS[user.mlmStatus || 'inactive'] || 'Неактивен'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {user.rank || 'Новичок'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-gray-600">
                                                    {formatDateShortRu(user.createdAt)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <MLMNetworkVisualization
                                                    userId={user.id}
                                                    userName={`${user.firstName || ''} ${user.lastName || ''}`.trim()}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Информация о количестве отображаемых пользователей */}
            <div className="text-sm text-gray-600 text-center">
                Показано {filteredAndSortedUsers.length} из {users.length} пользователей
            </div>
        </div>
    );
};

export default MLMNetworkManagement;
