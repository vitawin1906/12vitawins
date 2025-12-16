import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Save, Package, Truck, Mail } from 'lucide-react';

interface DeliveryApiKeys {
  cdek_account: string;
  cdek_secret: string;
  russianpost_key: string;
  yandex_key: string;
}

export function DeliverySettings() {
  const [apiKeys, setApiKeys] = useState<DeliveryApiKeys>(() => {
    // Загружаем сохраненные настройки из localStorage
    const saved = localStorage.getItem('vitawin_delivery_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {
          cdek_account: '',
          cdek_secret: '',
          russianpost_key: '',
          yandex_key: ''
        };
      }
    }
    return {
      cdek_account: '',
      cdek_secret: '',
      russianpost_key: '',
      yandex_key: ''
    };
  });

  const [showKeys, setShowKeys] = useState({
    cdek_account: false,
    cdek_secret: false,
    russianpost_key: false,
    yandex_key: false
  });

  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const saveApiKeys = async () => {
    setSaving(true);
    try {
      // Сохраняем в localStorage
      localStorage.setItem('vitawin_delivery_settings', JSON.stringify(apiKeys));
      
      toast({
        title: 'Успешно сохранено',
        description: 'Настройки доставки обновлены'
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить настройки',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateApiKey = (key: keyof DeliveryApiKeys, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const toggleShowKey = (key: keyof DeliveryApiKeys) => {
    setShowKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Настройки доставки</h3>
        <p className="text-sm text-muted-foreground">
          Управление API ключами для служб доставки
        </p>
      </div>

      <Separator />

      <div className="grid gap-6">
        {/* СДЭК */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              СДЭК (CDEK)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cdek_account">Аккаунт СДЭК</Label>
                <div className="relative">
                  <Input
                    id="cdek_account"
                    type={showKeys.cdek_account ? 'text' : 'password'}
                    value={apiKeys.cdek_account}
                    onChange={(e) => updateApiKey('cdek_account', e.target.value)}
                    placeholder="Введите аккаунт СДЭК"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => toggleShowKey('cdek_account')}
                  >
                    {showKeys.cdek_account ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="cdek_secret">Секретный ключ СДЭК</Label>
                <div className="relative">
                  <Input
                    id="cdek_secret"
                    type={showKeys.cdek_secret ? 'text' : 'password'}
                    value={apiKeys.cdek_secret}
                    onChange={(e) => updateApiKey('cdek_secret', e.target.value)}
                    placeholder="Введите секретный ключ СДЭК"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => toggleShowKey('cdek_secret')}
                  >
                    {showKeys.cdek_secret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Почта России */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Почта России
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="russianpost_key">API ключ Почты России</Label>
              <div className="relative">
                <Input
                  id="russianpost_key"
                  type={showKeys.russianpost_key ? 'text' : 'password'}
                  value={apiKeys.russianpost_key}
                  onChange={(e) => updateApiKey('russianpost_key', e.target.value)}
                  placeholder="Введите API ключ Почты России"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => toggleShowKey('russianpost_key')}
                >
                  {showKeys.russianpost_key ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Яндекс Доставка */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-red-600" />
              Яндекс Доставка
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="yandex_key">API ключ Яндекс Доставки</Label>
              <div className="relative">
                <Input
                  id="yandex_key"
                  type={showKeys.yandex_key ? 'text' : 'password'}
                  value={apiKeys.yandex_key}
                  onChange={(e) => updateApiKey('yandex_key', e.target.value)}
                  placeholder="Введите API ключ Яндекс Доставки"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => toggleShowKey('yandex_key')}
                >
                  {showKeys.yandex_key ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={saveApiKeys} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </Button>
      </div>
    </div>
  );
}