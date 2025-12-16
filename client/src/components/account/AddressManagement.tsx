import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Home, Briefcase, MapPin, Plus, Trash2, Check, Loader2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useGetMyAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
  useSetDefaultAddressMutation,
} from '@/store/api/domains';
import type { Address, CreateAddressDto, AddressType } from '@/types/address';
import { formatAddressOneLine, getAddressTypeName, validateAddress } from '@/utils/address/normalize';

/**
 * AddressManagement - Управление адресами доставки
 *
 * Позволяет пользователю:
 * - Просматривать все свои адреса
 * - Добавлять новые адреса
 * - Редактировать существующие
 * - Удалять адреса
 * - Устанавливать адрес по умолчанию
 */
const AddressManagement = () => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  // RTK Query hooks
  const { data: addresses = [], isLoading, refetch } = useGetMyAddressesQuery();
  const [createAddress, { isLoading: isCreating }] = useCreateAddressMutation();
  const [updateAddress, { isLoading: isUpdating }] = useUpdateAddressMutation();
  const [deleteAddress, { isLoading: isDeleting }] = useDeleteAddressMutation();
  const [setDefaultAddress] = useSetDefaultAddressMutation();

  // Form state
  const [formData, setFormData] = useState<CreateAddressDto>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'Россия',
    type: 'home',
    isDefault: false,
  });

  // Открыть диалог создания
  const handleOpenCreate = () => {
    setEditingAddress(null);
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: 'Россия',
      type: 'home',
      isDefault: false,
    });
    setIsDialogOpen(true);
  };

  // Открыть диалог редактирования
  const handleOpenEdit = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      name: address.name,
      address: address.address,
      city: address.city,
      state: address.state || '',
      zip: address.zip,
      country: address.country,
      type: address.type,
      isDefault: address.isDefault,
    });
    setIsDialogOpen(true);
  };

  // Создать/обновить адрес
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    const validation = validateAddress(formData);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      toast({
        title: 'Ошибка валидации',
        description: firstError,
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingAddress) {
        // Обновление
        await updateAddress({
          id: editingAddress.id,
          ...formData,
        }).unwrap();

        toast({
          title: 'Адрес обновлён',
          description: 'Изменения успешно сохранены',
        });
      } else {
        // Создание
        await createAddress(formData).unwrap();

        toast({
          title: 'Адрес добавлен',
          description: 'Новый адрес успешно добавлен',
        });
      }

      setIsDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error?.data?.message || 'Не удалось сохранить адрес',
        variant: 'destructive',
      });
    }
  };

  // Удалить адрес
  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот адрес?')) {
      return;
    }

    try {
      await deleteAddress(id).unwrap();
      toast({
        title: 'Адрес удалён',
        description: 'Адрес успешно удалён',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error?.data?.message || 'Не удалось удалить адрес',
        variant: 'destructive',
      });
    }
  };

  // Установить адрес по умолчанию
  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAddress(id).unwrap();
      toast({
        title: 'Адрес по умолчанию изменён',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error?.data?.message || 'Не удалось изменить адрес по умолчанию',
        variant: 'destructive',
      });
    }
  };

  // Иконка для типа адреса
  const getTypeIcon = (type: AddressType) => {
    return type === 'home' ? <Home className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />;
  };

  if (isLoading) {
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Адреса доставки
              </CardTitle>
              <CardDescription>Управление адресами для доставки заказов</CardDescription>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить адрес
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingAddress ? 'Редактировать адрес' : 'Новый адрес'}
                  </DialogTitle>
                  <DialogDescription>
                    Укажите адрес для доставки заказов
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Название */}
                  <div>
                    <Label htmlFor="name">Название *</Label>
                    <Input
                      id="name"
                      placeholder="Дом, Офис, и т.д."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  {/* Адрес */}
                  <div>
                    <Label htmlFor="address">Адрес *</Label>
                    <Input
                      id="address"
                      placeholder="Улица, дом, квартира"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      required
                    />
                  </div>

                  {/* Город */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">Город *</Label>
                      <Input
                        id="city"
                        placeholder="Москва"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="zip">Индекс *</Label>
                      <Input
                        id="zip"
                        placeholder="123456"
                        value={formData.zip}
                        onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                        maxLength={6}
                        required
                      />
                    </div>
                  </div>

                  {/* Область */}
                  <div>
                    <Label htmlFor="state">Область/регион</Label>
                    <Input
                      id="state"
                      placeholder="Московская область"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                  </div>

                  {/* Страна */}
                  <div>
                    <Label htmlFor="country">Страна *</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      required
                    />
                  </div>

                  {/* Тип адреса */}
                  <div>
                    <Label htmlFor="type">Тип адреса *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, type: value as AddressType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home">Дом</SelectItem>
                        <SelectItem value="work">Работа</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* По умолчанию */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={formData.isDefault}
                      onChange={(e) =>
                        setFormData({ ...formData, isDefault: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="isDefault" className="cursor-pointer">
                      Использовать по умолчанию
                    </Label>
                  </div>

                  {/* Кнопки */}
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={isCreating || isUpdating} className="flex-1">
                      {(isCreating || isUpdating) && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {editingAddress ? 'Сохранить' : 'Добавить'}
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
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Список адресов */}
      {addresses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">Нет адресов доставки</p>
            <p className="text-sm text-muted-foreground mb-4">
              Добавьте адрес для доставки ваших заказов
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <Card key={address.id} className={address.isDefault ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(address.type)}
                    <CardTitle className="text-lg">{address.name}</CardTitle>
                  </div>

                  <div className="flex items-center gap-2">
                    {address.isDefault && (
                      <Badge variant="default">
                        <Check className="h-3 w-3 mr-1" />
                        По умолчанию
                      </Badge>
                    )}
                    <Badge variant="outline">{getAddressTypeName(address.type)}</Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm">{formatAddressOneLine(address)}</p>

                  <div className="flex gap-2 pt-2">
                    {!address.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetDefault(address.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Сделать основным
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(address)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Изменить
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(address.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Удалить
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressManagement;
