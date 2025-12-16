import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, TestTube, Plus, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useGetPaymentSettingsQuery,
  useCreatePaymentSettingsMutation,
  useUpdatePaymentSettingsMutation,
  useDeletePaymentSettingsMutation,
  useTestTinkoffConnectionMutation,
  type PaymentSettings,
  type NewPaymentSettings
} from "@/store/api/domains";

export function PaymentSettings() {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NewPaymentSettings>({
    provider: "tinkoff",
    terminalKey: "",
    secretKey: "",
    isTestMode: true,
    isActive: false,
  });

  const { data: settings = [], isLoading } = useGetPaymentSettingsQuery();
  const [createPaymentSettings, { isLoading: isCreating_ }] = useCreatePaymentSettingsMutation();
  const [updatePaymentSettings, { isLoading: isUpdating }] = useUpdatePaymentSettingsMutation();
  const [deletePaymentSettings, { isLoading: isDeleting }] = useDeletePaymentSettingsMutation();
  const [testTinkoffConnection, { isLoading: isTesting }] = useTestTinkoffConnectionMutation();

  const resetForm = () => {
    setFormData({
      provider: "tinkoff",
      terminalKey: "",
      secretKey: "",
      isTestMode: true,
      isActive: false,
    });
  };

  const handleEdit = (setting: PaymentSettings) => {
    setEditingId(setting.id);
    setFormData({
      provider: setting.provider,
      terminalKey: setting.terminalKey,
      secretKey: setting.secretKey,
      isTestMode: setting.isTestMode,
      isActive: setting.isActive,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.terminalKey || !formData.secretKey) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingId) {
        await updatePaymentSettings({ id: editingId, data: formData }).unwrap();
        toast({
          title: "Успешно",
          description: "Настройки платежного терминала обновлены",
        });
      } else {
        await createPaymentSettings(formData).unwrap();
        toast({
          title: "Успешно",
          description: "Настройки платежного терминала созданы",
        });
      }

      setIsCreating(false);
      setEditingId(null);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error?.data?.message || 'Ошибка при сохранении настроек',
        variant: "destructive",
      });
    }
  };

  const handleTestConnection = async () => {
    if (!formData.terminalKey || !formData.secretKey) {
      toast({
        title: "Ошибка",
        description: "Заполните ключ терминала и секретный ключ для тестирования",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await testTinkoffConnection({
        terminalKey: formData.terminalKey,
        secretKey: formData.secretKey,
        isTestMode: formData.isTestMode,
      }).unwrap();

      toast({
        title: "Подключение успешно",
        description: `Тестирование прошло успешно (${result.testMode ? "тестовый" : "боевой"} режим)`,
      });
    } catch (error: any) {
      toast({
        title: "Ошибка подключения",
        description: error?.data?.message || 'Ошибка подключения',
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePaymentSettings(id).unwrap();
      toast({
        title: "Успешно",
        description: "Настройки платежного терминала удалены",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error?.data?.message || 'Ошибка при удалении',
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Настройки платежей</h2>
          <p className="text-muted-foreground">Управление интеграциями с платежными системами</p>
        </div>
        {!isCreating && !editingId && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить интеграцию
          </Button>
        )}
      </div>

      {/* Форма создания/редактирования */}
      {(isCreating || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? "Редактирование настроек" : "Новая интеграция"}
            </CardTitle>
            <CardDescription>
              Настройте подключение к платежной системе Тинькофф
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="provider">Провайдер</Label>
                  <Input
                    id="provider"
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    placeholder="tinkoff"
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="terminal_key">Ключ терминала *</Label>
                  <Input
                    id="terminal_key"
                    value={formData.terminalKey}
                    onChange={(e) => setFormData({ ...formData, terminalKey: e.target.value })}
                    placeholder="Введите ключ терминала"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="secret_key">Секретный ключ *</Label>
                <Input
                  id="secret_key"
                  type="password"
                  value={formData.secretKey}
                  onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                  placeholder="Введите секретный ключ"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_test_mode"
                  checked={formData.isTestMode}
                  onCheckedChange={(checked) => setFormData({ ...formData, isTestMode: checked })}
                />
                <Label htmlFor="is_test_mode">Тестовый режим</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="is_active">Активно</Label>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  В тестовом режиме используется песочница Тинькофф.
                  Отключите тестовый режим только после полной настройки и тестирования.
                </AlertDescription>
              </Alert>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  Тестировать подключение
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating_ || isUpdating}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingId ? "Обновить" : "Создать"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingId(null);
                    resetForm();
                  }}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Список существующих настроек */}
      <div className="space-y-4">
        {settings.map((setting) => (
          <Card key={setting.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold">{setting.provider.toUpperCase()}</h3>
                    <Badge variant={setting.isActive ? "default" : "secondary"}>
                      {setting.isActive ? "Активно" : "Неактивно"}
                    </Badge>
                    <Badge variant={setting.isTestMode ? "outline" : "destructive"}>
                      {setting.isTestMode ? "Тест" : "Продакшн"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ключ терминала: {setting.terminalKey}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Создано: {new Date(setting.createdAt).toLocaleString('ru-RU')}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(setting)}
                  >
                    Редактировать
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(setting.id)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {settings.length === 0 && !isCreating && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground">Настройки платежных систем не найдены</p>
                <Button className="mt-4" onClick={() => setIsCreating(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить первую интеграцию
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
