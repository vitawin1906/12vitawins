
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Ban, CheckCircle, Users, UserPlus, Phone, Loader2, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useGetAllUsersQuery,
  useUpdateUserMutation,
  useUpgradeToPartnerMutation,
} from '@/store/api/domains';
import { User } from "@/types/user";

const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // RTK Query hooks
  const { data: users = [], isLoading, isError, refetch } = useGetAllUsersQuery();
  const [updateUser] = useUpdateUserMutation();
  const [upgradeToPartner] = useUpgradeToPartnerMutation();

  // Фильтрация пользователей
  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.referralCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

    const getInitials = (user: User) => {
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase();
        return (user.email?.[0] ?? '?').toUpperCase();
    };

  const handleToggleActive = async (user: User) => {
    try {
      await updateUser({ id: user.id, isActive: !user.isActive }).unwrap();
      toast({
        title: user.isActive ? "Пользователь деактивирован" : "Пользователь активирован",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error?.data?.message || "Не удалось изменить статус пользователя",
        variant: "destructive"
      });
    }
  };

  const handleUpgradeToPartner = async (userId: string) => {
    try {
      await upgradeToPartner(userId).unwrap();
      toast({
        title: "Пользователь повышен до партнёра",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error?.data?.message || "Не удалось повысить пользователя",
        variant: "destructive"
      });
    }
  };

  const totalCustomers = users.filter(u => !u.isAdmin).length;
  const activeUsers = users.filter(u => u.isActive).length;
  const totalBalance = users.reduce((sum, u) => sum + Number(u.balance || 0), 0);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-red-600">Ошибка загрузки пользователей</p>
        <Button onClick={() => refetch()} variant="outline">
          Попробовать снова
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Управление пользователями</h2>
          <p className="text-gray-600">Просматривайте и управляйте пользователями системы</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Всего пользователей</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Клиенты</p>
                <p className="text-2xl font-bold">{totalCustomers}</p>
              </div>
              <UserPlus className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Активные</p>
                <p className="text-2xl font-bold">{activeUsers}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Общий баланс</p>
                <p className="text-2xl font-bold">{totalBalance.toFixed(2)} ₽</p>
              </div>
              <Phone className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список пользователей</CardTitle>
          <CardDescription>Все зарегистрированные пользователи</CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Поиск пользователей..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Контакты</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Заказы</TableHead>
                <TableHead>Потрачено</TableHead>
                <TableHead>Последний вход</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>{getInitials(user)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.firstName || user.username || 'Без имени'}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {user.telegramId && (
                        <div className="text-sm text-gray-600">Telegram: {user.telegramId}</div>
                      )}
                      {user.username && (
                        <div className="text-sm text-blue-600">@{user.username}</div>
                      )}
                      {user.referralCode && (
                        <div className="text-sm text-emerald-600">Код: {user.referralCode}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={user.isAdmin ? 'default' : 'secondary'}>
                        {user.isAdmin ? 'Администратор' : 'Клиент'}
                      </Badge>
                      {user.mlmStatus === 'partner' || user.mlmStatus === 'partner_pro' ? (
                        <Badge variant="outline" className="border-emerald-500 text-emerald-700">
                          <Crown className="w-3 h-3 mr-1" />
                          Партнёр
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive ? 'Активный' : 'Неактивный'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">—</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{Number(user.balance || 0).toFixed(2)} ₽</span>
                  </TableCell>
                  <TableCell>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {user.mlmStatus === 'customer' && !user.isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpgradeToPartner(user.id)}
                        >
                          <Crown className="h-3 w-3 mr-1" />
                          Сделать партнёром
                        </Button>
                      )}
                      {!user.isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.isActive ? (
                            <>
                              <Ban className="h-3 w-3 mr-1" />
                              Деактивировать
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Активировать
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export { UserManagement };
