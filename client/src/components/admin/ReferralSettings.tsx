import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Percent, Coins, Save, RefreshCw } from 'lucide-react';
import { useGetReferralSettingsQuery, useUpdateReferralSettingsMutation } from '@/store/api/domains';
import { useToast } from '@/hooks/use-toast';

interface ReferralSettingsData {
  level1_commission: number;
  level2_commission: number;
  level3_commission: number;
  bonus_coins_percentage: number;
}

const ReferralSettings = () => {
  const [formData, setFormData] = useState<ReferralSettingsData>({
    level1_commission: 20,
    level2_commission: 5,
    level3_commission: 1,
    bonus_coins_percentage: 5
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();

  // Загрузка текущих настроек via RTK Query
  const { data: settingsData, isLoading } = useGetReferralSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateReferralSettingsMutation();

  // Обновление формы при загрузке данных
  useEffect(() => {
    if (settingsData?.settings) {
      const s = settingsData.settings;
      setFormData({
        level1_commission: Number(s.level1Commission) || 20,
        level2_commission: Number(s.level2Commission) || 5,
        level3_commission: Number(s.level3Commission) || 1,
        bonus_coins_percentage: Number(s.bonusCoinsPercentage) || 5
      });
    }
  }, [settingsData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.level1_commission < 0 || formData.level1_commission > 100) {
      newErrors.level1_commission = 'Комиссия должна быть от 0 до 100%';
    }

    if (formData.level2_commission < 0 || formData.level2_commission > 100) {
      newErrors.level2_commission = 'Комиссия должна быть от 0 до 100%';
    }

    if (formData.level3_commission < 0 || formData.level3_commission > 100) {
      newErrors.level3_commission = 'Комиссия должна быть от 0 до 100%';
    }

    if (formData.bonus_coins_percentage < 0 || formData.bonus_coins_percentage > 100) {
      newErrors.bonus_coins_percentage = 'Процент бонусов должен быть от 0 до 100%';
    }

    if (formData.level1_commission + formData.level2_commission + formData.level3_commission > 50) {
      newErrors.total = 'Общая сумма комиссий не должна превышать 50%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await updateSettings({
        level1Commission: formData.level1_commission,
        level2Commission: formData.level2_commission,
        level3Commission: formData.level3_commission,
        bonusCoinsPercentage: formData.bonus_coins_percentage
      }).unwrap();

      toast({
        title: "Успешно",
        description: 'Настройки реферальной программы сохранены',
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error?.data?.message || 'Не удалось сохранить настройки',
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: keyof ReferralSettingsData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, [field]: numValue }));
    
    // Очистить ошибку для этого поля при изменении
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const resetToDefaults = () => {
    setFormData({
      level1_commission: 20,
      level2_commission: 5,
      level3_commission: 1,
      bonus_coins_percentage: 5
    });
    setErrors({});
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Настройки реферальной программы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">Загрузка...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Настройки реферальной программы
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Настройте процентные ставки для реферальной программы. ИИ агент будет использовать эти значения для автоматического начисления бонусов.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Реферал 1 уровня */}
            <div className="space-y-2">
              <Label htmlFor="level1_commission" className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Реферал 1 уровня (%)
              </Label>
              <Input
                id="level1_commission"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.level1_commission}
                onChange={(e) => handleInputChange('level1_commission', e.target.value)}
                placeholder="20"
                className={errors.level1_commission ? 'border-red-500' : ''}
              />
              {errors.level1_commission && (
                <p className="text-sm text-red-500">{errors.level1_commission}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Комиссия за прямых рефералов (те, кто зарегистрировался по вашей ссылке)
              </p>
            </div>

            {/* Реферал 2 уровня */}
            <div className="space-y-2">
              <Label htmlFor="level2_commission" className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Реферал 2 уровня (%)
              </Label>
              <Input
                id="level2_commission"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.level2_commission}
                onChange={(e) => handleInputChange('level2_commission', e.target.value)}
                placeholder="5"
                className={errors.level2_commission ? 'border-red-500' : ''}
              />
              {errors.level2_commission && (
                <p className="text-sm text-red-500">{errors.level2_commission}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Комиссия за рефералов ваших рефералов
              </p>
            </div>

            {/* Реферал 3 уровня */}
            <div className="space-y-2">
              <Label htmlFor="level3_commission" className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Реферал 3 уровня (%)
              </Label>
              <Input
                id="level3_commission"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.level3_commission}
                onChange={(e) => handleInputChange('level3_commission', e.target.value)}
                placeholder="1"
                className={errors.level3_commission ? 'border-red-500' : ''}
              />
              {errors.level3_commission && (
                <p className="text-sm text-red-500">{errors.level3_commission}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Комиссия за рефералов третьего уровня
              </p>
            </div>

            {/* Бонусные монеты */}
            <div className="space-y-2">
              <Label htmlFor="bonus_coins_percentage" className="flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Бонусное начисление монет (%)
              </Label>
              <Input
                id="bonus_coins_percentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.bonus_coins_percentage}
                onChange={(e) => handleInputChange('bonus_coins_percentage', e.target.value)}
                placeholder="5"
                className={errors.bonus_coins_percentage ? 'border-red-500' : ''}
              />
              {errors.bonus_coins_percentage && (
                <p className="text-sm text-red-500">{errors.bonus_coins_percentage}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Дополнительные бонусные монеты для реферальных покупок
              </p>
            </div>

            {/* Общая ошибка */}
            {errors.total && (
              <Alert variant="destructive">
                <AlertDescription>{errors.total}</AlertDescription>
              </Alert>
            )}

            {/* Информация о текущих настройках */}
            <Alert>
              <Coins className="h-4 w-4" />
              <AlertDescription>
                <strong>Текущие настройки:</strong>
                <div className="mt-2 text-sm space-y-1">
                  <div>• 1 уровень: {formData.level1_commission}% комиссии</div>
                  <div>• 2 уровень: {formData.level2_commission}% комиссии</div>
                  <div>• 3 уровень: {formData.level3_commission}% комиссии</div>
                  <div>• Бонусы: {formData.bonus_coins_percentage}% дополнительно</div>
                  <div className="font-medium">
                    Общая комиссия: {(formData.level1_commission + formData.level2_commission + formData.level3_commission).toFixed(1)}%
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Кнопки управления */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Сохранить настройки
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={resetToDefaults}
                disabled={isSaving}              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Сбросить
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralSettings;