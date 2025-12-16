import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Save, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useGetBonusPreferencesQuery, useUpdateBonusPreferencesMutation } from '@/store/api/domains';

interface BonusPreferencesData {
  id: string;
  user_id: string;
  health_id_percentage: number;
  travel_percentage: number;
  home_percentage: number;
  auto_percentage: number;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

const BonusPreferences: React.FC = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    health_id_percentage: 25,
    travel_percentage: 25,
    home_percentage: 25,
    auto_percentage: 25
  });

  // Получаем текущие настройки
  const { data: preferences, isLoading, error } = useGetBonusPreferencesQuery();
  const [updatePreferences, { isLoading: isSaving }] = useUpdateBonusPreferencesMutation();

  // Обновляем форму при получении данных
  useEffect(() => {
    if (preferences) {
      setFormData({
        health_id_percentage: preferences.healthPercent,
        travel_percentage: preferences.travelPercent,
        home_percentage: preferences.homePercent,
        auto_percentage: preferences.autoPercent
      });
    }
  }, [preferences]);

  // Обработчик изменения значений
  const handleChange = (field: keyof typeof formData, value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      [field]: Math.max(0, Math.min(100, numValue))
    }));
  };

  // Автоматическая корректировка для обеспечения суммы 100%
  const handleBlur = () => {
    const total = Object.values(formData).reduce((sum, val) => sum + val, 0);
    if (total !== 100) {
      // Равномерно распределяем остаток
      const diff = 100 - total;
      const perField = Math.floor(diff / 4);
      const remainder = diff % 4;
      
      setFormData(prev => ({
        health_id_percentage: prev.health_id_percentage + perField + (remainder > 0 ? 1 : 0),
        travel_percentage: prev.travel_percentage + perField + (remainder > 1 ? 1 : 0),
        home_percentage: prev.home_percentage + perField + (remainder > 2 ? 1 : 0),
        auto_percentage: prev.auto_percentage + perField
      }));
    }
  };

  // Проверка валидности суммы
  const totalPercentage = Object.values(formData).reduce((sum, val) => sum + val, 0);
  const isValidTotal = totalPercentage === 100;
  const isLocked = preferences?.locked || false;

  const handleSave = async () => {
    if (!isValidTotal) {
      toast({
        title: "Ошибка валидации",
        description: "Сумма всех процентов должна равняться 100%",
        variant: "destructive"
      });
      return;
    }

    try {
      await updatePreferences({
        health_percent: formData.health_id_percentage,
        travel_percent: formData.travel_percentage,
        home_percent: formData.home_percentage,
        auto_percent: formData.auto_percentage,
      }).unwrap();

      toast({
        title: "Настройки сохранены",
        description: "Ваши предпочтения бонусов успешно обновлены",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error?.data?.error || "Не удалось сохранить настройки",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Загрузка настроек...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Ошибка загрузки настроек бонусов
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Свобода выбора</span>
          {isLocked && (
            <Badge variant="secondary" className="ml-2">
              <Lock className="h-3 w-3 mr-1" />
              Заблокировано
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Настройте распределение дополнительных бонусов по категориям. 
          Общая сумма должна составлять 100%.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Категории бонусов */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="health_id" className="flex items-center gap-2">
              🏥 Health ID
            </Label>
            <div className="flex items-center space-x-2 mt-1">
              <Input
                id="health_id"
                type="number"
                min="0"
                max="100"
                value={formData.health_id_percentage}
                onChange={(e) => handleChange('health_id_percentage', e.target.value)}
                onBlur={handleBlur}
                disabled={isLocked}
                className="w-20"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>

          <div>
            <Label htmlFor="travel" className="flex items-center gap-2">
              ✈️ Мои путешествия
            </Label>
            <div className="flex items-center space-x-2 mt-1">
              <Input
                id="travel"
                type="number"
                min="0"
                max="100"
                value={formData.travel_percentage}
                onChange={(e) => handleChange('travel_percentage', e.target.value)}
                onBlur={handleBlur}
                disabled={isLocked}
                className="w-20"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>

          <div>
            <Label htmlFor="home" className="flex items-center gap-2">
              🏠 Мой дом
            </Label>
            <div className="flex items-center space-x-2 mt-1">
              <Input
                id="home"
                type="number"
                min="0"
                max="100"
                value={formData.home_percentage}
                onChange={(e) => handleChange('home_percentage', e.target.value)}
                onBlur={handleBlur}
                disabled={isLocked}
                className="w-20"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>

          <div>
            <Label htmlFor="auto" className="flex items-center gap-2">
              🚗 Авто
            </Label>
            <div className="flex items-center space-x-2 mt-1">
              <Input
                id="auto"
                type="number"
                min="0"
                max="100"
                value={formData.auto_percentage}
                onChange={(e) => handleChange('auto_percentage', e.target.value)}
                onBlur={handleBlur}
                disabled={isLocked}
                className="w-20"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
        </div>

        {/* Индикатор суммы */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">Общая сумма:</span>
            <span className={`font-bold text-lg ${
              totalPercentage === 100 ? 'text-green-600' : 'text-red-600'
            }`}>
              {totalPercentage}%
            </span>
          </div>
          {totalPercentage !== 100 && (
            <Alert className="mt-2" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Сумма должна составлять 100%. Текущая сумма: {totalPercentage}%
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Кнопка сохранения */}
        {!isLocked && (
          <Button
            onClick={handleSave}
            disabled={!isValidTotal || isSaving}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
          </Button>
        )}

        {isLocked && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Ваши настройки заблокированы администратором и не могут быть изменены.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default BonusPreferences;