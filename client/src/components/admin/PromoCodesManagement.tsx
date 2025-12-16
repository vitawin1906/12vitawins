// client/src/components/admin/PromoCodesManagement.tsx
import { useState } from 'react';
import { useGetPromoCodesQuery, useCreatePromoCodeMutation, useUpdatePromoCodeMutation, useDeletePromoCodeMutation, useGetPromoCodeUsageQuery, type PromoCode, type CreatePromoCodeInput, type UpdatePromoCodeInput } from '@/store/api/domains/promoCodesApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Gift, Plus, Edit, Trash2, Eye, Calendar, Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';

const PromoCodesManagement = () => {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<PromoCode | null>(null);

  // RTK Query hooks
  const { data: promoCodesData, isLoading, refetch } = useGetPromoCodesQuery({ limit: 100, offset: 0 });
  const [createPromoCode, { isLoading: isCreating }] = useCreatePromoCodeMutation();
  const [updatePromoCode, { isLoading: isUpdating }] = useUpdatePromoCodeMutation();
  const [deletePromoCode, { isLoading: isDeleting }] = useDeletePromoCodeMutation();
  const { data: usageData } = useGetPromoCodeUsageQuery(
    { id: selectedPromo?.id || '', limit: 100, offset: 0 },
    { skip: !selectedPromo || !usageDialogOpen }
  );

  const promoCodes = promoCodesData?.promoCodes || [];

  // Forms
  const createForm = useForm<CreatePromoCodeInput>({
    defaultValues: {
      code: '',
      name: '',
      type: 'percent_off',
      percentOff: 10,
      minOrderRub: 0,
      onePerUser: false,
      isActive: true,
    },
  });

  const editForm = useForm<UpdatePromoCodeInput>();

  // Handlers
  const handleCreate = async (data: CreatePromoCodeInput) => {
    try {
      const payload: CreatePromoCodeInput = {
        ...data,
        code: data.code.toUpperCase(),
      };

      await createPromoCode(payload).unwrap();
      toast({
        title: 'Промокод создан',
        description: `Промокод ${data.code} успешно создан`,
      });
      setCreateDialogOpen(false);
      createForm.reset();
      refetch();
    } catch (error: any) {
      toast({
        title: 'Ошибка создания',
        description: error?.data?.message || 'Не удалось создать промокод',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = async (data: UpdatePromoCodeInput) => {
    if (!selectedPromo) return;

    try {
      await updatePromoCode({ id: selectedPromo.id, data }).unwrap();
      toast({
        title: 'Промокод обновлён',
        description: 'Изменения успешно сохранены',
      });
      setEditDialogOpen(false);
      setSelectedPromo(null);
      refetch();
    } catch (error: any) {
      toast({
        title: 'Ошибка обновления',
        description: error?.data?.message || 'Не удалось обновить промокод',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот промокод?')) return;

    try {
      await deletePromoCode({ id }).unwrap();
      toast({
        title: 'Промокод удалён',
        description: 'Промокод успешно удалён',
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Ошибка удаления',
        description: error?.data?.message || 'Не удалось удалить промокод',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (promo: PromoCode) => {
    setSelectedPromo(promo);
    editForm.reset({
      name: promo.name,
      isActive: promo.isActive,
      maxUses: promo.maxUses || undefined,
      startsAt: promo.startsAt || undefined,
      expiresAt: promo.expiresAt || undefined,
    });
    setEditDialogOpen(true);
  };

  const openUsageDialog = (promo: PromoCode) => {
    setSelectedPromo(promo);
    setUsageDialogOpen(true);
  };

  const getStatusBadge = (promo: PromoCode) => {
    const now = new Date();

    if (!promo.isActive) {
      return <Badge variant="secondary" className="bg-gray-200"><XCircle className="h-3 w-3 mr-1" />Неактивен</Badge>;
    }

    if (promo.startsAt && new Date(promo.startsAt) > now) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Calendar className="h-3 w-3 mr-1" />Ожидает</Badge>;
    }

    if (promo.expiresAt && new Date(promo.expiresAt) < now) {
      return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Истёк</Badge>;
    }

    if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
      return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Исчерпан</Badge>;
    }

    return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800"><CheckCircle2 className="h-3 w-3 mr-1" />Активен</Badge>;
  };

  const getDiscountText = (promo: PromoCode) => {
    if (promo.type === 'percent_off') {
      return `${promo.percentOff}%`;
    } else {
      return `${promo.fixedAmountRub} ₽`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Управление промокодами
            </CardTitle>
            <CardDescription>
              Создавайте и управляйте промокодами для скидок на заказы
            </CardDescription>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Создать промокод
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Создать промокод</DialogTitle>
                <DialogDescription>
                  Заполните форму для создания нового промокода
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="code">Код промокода *</Label>
                    <Input
                      id="code"
                      placeholder="SUMMER2024"
                      {...createForm.register('code', { required: true })}
                      maxLength={50}
                      className="uppercase"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Название *</Label>
                    <Input
                      id="name"
                      placeholder="Летняя распродажа"
                      {...createForm.register('name', { required: true })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Тип скидки *</Label>
                  <RadioGroup
                    value={createForm.watch('type')}
                    onValueChange={(value) => createForm.setValue('type', value as any)}
                    className="grid grid-cols-2 gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2 border rounded-lg p-3">
                      <RadioGroupItem value="percent_off" id="percent" />
                      <Label htmlFor="percent" className="cursor-pointer">Процент от суммы</Label>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-lg p-3">
                      <RadioGroupItem value="fixed_amount" id="fixed" />
                      <Label htmlFor="fixed" className="cursor-pointer">Фиксированная сумма</Label>
                    </div>
                  </RadioGroup>
                </div>

                {createForm.watch('type') === 'percent_off' ? (
                  <div>
                    <Label htmlFor="percentOff">Процент скидки (0-100%) *</Label>
                    <Input
                      id="percentOff"
                      type="number"
                      min="0"
                      max="100"
                      {...createForm.register('percentOff', { valueAsNumber: true })}
                    />
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="fixedAmountRub">Сумма скидки (₽) *</Label>
                    <Input
                      id="fixedAmountRub"
                      type="number"
                      min="0"
                      step="0.01"
                      {...createForm.register('fixedAmountRub', { valueAsNumber: true })}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minOrderRub">Минимальная сумма заказа (₽)</Label>
                    <Input
                      id="minOrderRub"
                      type="number"
                      min="0"
                      step="0.01"
                      {...createForm.register('minOrderRub', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxUses">Максимальное количество использований</Label>
                    <Input
                      id="maxUses"
                      type="number"
                      min="1"
                      placeholder="Без ограничений"
                      {...createForm.register('maxUses', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startsAt">Дата начала действия</Label>
                    <Input
                      id="startsAt"
                      type="datetime-local"
                      {...createForm.register('startsAt')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiresAt">Дата окончания действия</Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      {...createForm.register('expiresAt')}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="onePerUser"
                      checked={createForm.watch('onePerUser')}
                      onCheckedChange={(checked) => createForm.setValue('onePerUser', !!checked)}
                    />
                    <Label htmlFor="onePerUser" className="cursor-pointer">
                      Один раз на пользователя
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      checked={createForm.watch('isActive')}
                      onCheckedChange={(checked) => createForm.setValue('isActive', !!checked)}
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">
                      Активен
                    </Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Создание...
                      </>
                    ) : (
                      'Создать'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Код</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Скидка</TableHead>
                <TableHead>Использовано</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Срок действия</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promoCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Промокодов пока нет. Создайте первый!
                  </TableCell>
                </TableRow>
              ) : (
                promoCodes.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell>
                      <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm">
                        {promo.code}
                      </code>
                    </TableCell>
                    <TableCell>{promo.name}</TableCell>
                    <TableCell className="font-semibold">{getDiscountText(promo)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{promo.currentUses}</span>
                        {promo.maxUses && (
                          <>
                            <span className="text-muted-foreground">/ {promo.maxUses}</span>
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 transition-all"
                                style={{ width: `${Math.min((promo.currentUses / promo.maxUses) * 100, 100)}%` }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(promo)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {promo.expiresAt ? (
                        <>
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {format(new Date(promo.expiresAt), 'dd.MM.yyyy')}
                        </>
                      ) : (
                        'Без ограничений'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openUsageDialog(promo)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(promo)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(promo.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать промокод</DialogTitle>
            <DialogDescription>
              Изменение кода и типа скидки недоступно
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Название</Label>
              <Input
                id="edit-name"
                {...editForm.register('name')}
              />
            </div>

            <div>
              <Label htmlFor="edit-maxUses">Максимальное количество использований</Label>
              <Input
                id="edit-maxUses"
                type="number"
                min="1"
                {...editForm.register('maxUses', { valueAsNumber: true })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-startsAt">Дата начала</Label>
                <Input
                  id="edit-startsAt"
                  type="datetime-local"
                  {...editForm.register('startsAt')}
                />
              </div>
              <div>
                <Label htmlFor="edit-expiresAt">Дата окончания</Label>
                <Input
                  id="edit-expiresAt"
                  type="datetime-local"
                  {...editForm.register('expiresAt')}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-isActive"
                checked={editForm.watch('isActive')}
                onCheckedChange={(checked) => editForm.setValue('isActive', !!checked)}
              />
              <Label htmlFor="edit-isActive" className="cursor-pointer">
                Активен
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  'Сохранить'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Usage History Dialog */}
      <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>История использования</DialogTitle>
            <DialogDescription>
              Промокод: <code className="bg-gray-100 px-2 py-1 rounded">{selectedPromo?.code}</code>
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {!usageData || usageData.usage?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Промокод ещё не использовался
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Скидка</TableHead>
                    <TableHead>Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageData.usage.map((usage: any) => (
                    <TableRow key={usage.id}>
                      <TableCell className="font-mono text-sm">{usage.userId.slice(0, 8)}...</TableCell>
                      <TableCell className="font-mono text-sm">{usage.orderId.slice(0, 8)}...</TableCell>
                      <TableCell className="font-semibold">{usage.discountRub} ₽</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(usage.createdAt), 'dd.MM.yyyy HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromoCodesManagement;
