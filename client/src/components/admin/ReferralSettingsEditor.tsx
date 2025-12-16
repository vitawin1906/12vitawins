import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { X, Save } from "lucide-react";
import { useGetReferralSettingsQuery, useUpdateReferralSettingsMutation } from "@/store/api/domains";

interface ReferralSettingsEditorProps {
  onClose: () => void;
}

interface ReferralSettingsData {
  level1_commission: number;
  level2_commission: number;
  level3_commission: number;
  bonus_coins_percentage: number;
}

const ReferralSettingsEditor = ({ onClose }: ReferralSettingsEditorProps) => {
  const [formData, setFormData] = useState<ReferralSettingsData>({
    level1_commission: 20,
    level2_commission: 5,
    level3_commission: 1,
    bonus_coins_percentage: 5
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();

  // Загрузка текущих настроек
  const { data: settingsResponse } = useGetReferralSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateReferralSettingsMutation();

  // Обновление формы при загрузке данных
  useEffect(() => {
    const settingsData = settingsResponse?.settings;
    if (settingsData) {
      setFormData({
        level1_commission: settingsData.level1Commission || 20,
        level2_commission: settingsData.level2Commission || 5,
        level3_commission: settingsData.level3Commission || 1,
        bonus_coins_percentage: settingsData.bonusCoinsPercentage || 5
      });
    }
  }, [settingsResponse]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Проверяем, что все значения в пределах 0-100
    Object.entries(formData).forEach(([key, value]) => {
      if (value < 0 || value > 100) {
        newErrors[key] = 'Значение должно быть от 0 до 100%';
      }
    });

    // Проверяем, что общая сумма комиссий не превышает разумных пределов
    const totalCommission = formData.level1_commission + formData.level2_commission + formData.level3_commission;
    if (totalCommission > 50) {
      newErrors.total = 'Общая сумма комиссий не должна превышать 50%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ReferralSettingsData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, [field]: numValue }));
    
    // Очищаем ошибку для этого поля
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSave = async () => {
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
        description: "Настройки реферальной программы обновлены",
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error?.data?.message || 'Ошибка при сохранении',
        variant: "destructive",
      });
    }
  };

  const purchaseAmount = 14995.00;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Настройки реферальной программы</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Форма настроек */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="level1_commission">Комиссия 1-го уровня (%)</Label>
                <Input
                  id="level1_commission"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.level1_commission}
                  onChange={(e) => handleInputChange('level1_commission', e.target.value)}
                  className={errors.level1_commission ? 'border-red-500' : ''}
                />
                {errors.level1_commission && (
                  <p className="text-sm text-red-500 mt-1">{errors.level1_commission}</p>
                )}
              </div>

              <div>
                <Label htmlFor="level2_commission">Комиссия 2-го уровня (%)</Label>
                <Input
                  id="level2_commission"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.level2_commission}
                  onChange={(e) => handleInputChange('level2_commission', e.target.value)}
                  className={errors.level2_commission ? 'border-red-500' : ''}
                />
                {errors.level2_commission && (
                  <p className="text-sm text-red-500 mt-1">{errors.level2_commission}</p>
                )}
              </div>

              <div>
                <Label htmlFor="level3_commission">Комиссия 3-го уровня (%)</Label>
                <Input
                  id="level3_commission"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.level3_commission}
                  onChange={(e) => handleInputChange('level3_commission', e.target.value)}
                  className={errors.level3_commission ? 'border-red-500' : ''}
                />
                {errors.level3_commission && (
                  <p className="text-sm text-red-500 mt-1">{errors.level3_commission}</p>
                )}
              </div>

              <div>
                <Label htmlFor="bonus_coins_percentage">Возврат бонусными монетами (%)</Label>
                <Input
                  id="bonus_coins_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.bonus_coins_percentage}
                  onChange={(e) => handleInputChange('bonus_coins_percentage', e.target.value)}
                  className={errors.bonus_coins_percentage ? 'border-red-500' : ''}
                />
                {errors.bonus_coins_percentage && (
                  <p className="text-sm text-red-500 mt-1">{errors.bonus_coins_percentage}</p>
                )}
              </div>

              {errors.total && (
                <p className="text-sm text-red-500">{errors.total}</p>
              )}
            </div>

            {/* Предварительный просмотр */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-4">Предварительный просмотр</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Ваш доход</span>
                  <span className="font-medium">от 100 000 руб.*</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Реферал 1-го уровня:</span>
                  <span className="font-medium text-emerald-600">{formData.level1_commission}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Реферал 2-го уровня:</span>
                  <span className="font-medium text-emerald-600">{formData.level2_commission}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Реферал 3-го уровня:</span>
                  <span className="font-medium text-emerald-600">{formData.level3_commission}%</span>
                </div>
                
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Общая комиссия:</span>
                    <span className={
                      (formData.level1_commission + formData.level2_commission + formData.level3_commission) > 50 
                        ? 'text-red-600' 
                        : 'text-gray-900'
                    }>
                      {(formData.level1_commission + formData.level2_commission + formData.level3_commission).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralSettingsEditor;