// client/src/components/account/FreedomSharesSettings.tsx
import { useState, useEffect } from 'react';
import {
  useGetFreedomSharesQuery,
  useUpdateFreedomSharesMutation,
  useGetFreedomSharesPresetsQuery,
  useApplyFreedomSharesPresetMutation,
  useSimulateFreedomSharesMutation,
  type FreedomShares,
} from '@/store/api/domains/freedomSharesApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { User, TrendingUp, Clock, Users as UsersIcon, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

const FreedomSharesSettings = () => {
  const { toast } = useToast();
  const { data: freedomSharesData, isLoading } = useGetFreedomSharesQuery();
  const { data: presetsData } = useGetFreedomSharesPresetsQuery();
  const [updateShares, { isLoading: isUpdating }] = useUpdateFreedomSharesMutation();
  const [applyPreset, { isLoading: isApplyingPreset }] = useApplyFreedomSharesPresetMutation();
  const [simulate, { isLoading: isSimulating }] = useSimulateFreedomSharesMutation();

  const [shares, setShares] = useState<FreedomShares>({
    personalFreedom: 25,
    financialFreedom: 25,
    timeFreedom: 25,
    socialFreedom: 25,
  });

  const [simulateAmount, setSimulateAmount] = useState<string>('1000');
  const [simulationResult, setSimulationResult] = useState<FreedomShares | null>(null);

  // Load current shares
  useEffect(() => {
    if (freedomSharesData?.freedomShares?.shares) {
      setShares(freedomSharesData.freedomShares.shares);
    }
  }, [freedomSharesData]);

  const handleShareChange = (key: keyof FreedomShares, value: number) => {
    setShares((prev) => ({ ...prev, [key]: value }));
  };

  const total = Object.values(shares).reduce((sum, val) => sum + val, 0);
  const isValid = total === 100;

  const handleSave = async () => {
    if (!isValid) {
      toast({
        title: 'Ошибка валидации',
        description: 'Сумма всех долей должна быть равна 100%',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateShares(shares).unwrap();
      toast({
        title: 'Настройки сохранены',
        description: 'Распределение бонусов обновлено',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка сохранения',
        description: error?.data?.message || 'Не удалось сохранить настройки',
        variant: 'destructive',
      });
    }
  };

  const handleApplyPreset = async (presetId: string) => {
    try {
      const result = await applyPreset(presetId).unwrap();
      setShares(result.shares);
      toast({
        title: 'Пресет применён',
        description: result.message,
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка применения',
        description: error?.data?.message || 'Не удалось применить пресет',
        variant: 'destructive',
      });
    }
  };

  const handleSimulate = async () => {
    const amount = parseFloat(simulateAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Введите корректную сумму',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await simulate({ amount }).unwrap();
      setSimulationResult(result.simulation.allocation);
    } catch (error: any) {
      toast({
        title: 'Ошибка симуляции',
        description: error?.data?.message || 'Не удалось выполнить симуляцию',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const balances = freedomSharesData?.freedomShares?.balances;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            Настройка распределения бонусов (Freedom Shares)
          </CardTitle>
          <CardDescription>
            Выберите, как распределять ваши бонусы между четырьмя фондами свободы. Сумма должна быть 100%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Текущие балансы */}
          {balances && (
            <div className="grid grid-cols-4 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-blue-700 mb-1">
                    <User className="h-4 w-4" />
                    <span className="text-xs font-medium">Личная</span>
                  </div>
                  <p className="text-lg font-bold text-blue-900">{balances.personalFreedom} ₽</p>
                </CardContent>
              </Card>
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-emerald-700 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium">Финансовая</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-900">{balances.financialFreedom} ₽</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-amber-700 mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">Временная</span>
                  </div>
                  <p className="text-lg font-bold text-amber-900">{balances.timeFreedom} ₽</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-purple-700 mb-1">
                    <UsersIcon className="h-4 w-4" />
                    <span className="text-xs font-medium">Социальная</span>
                  </div>
                  <p className="text-lg font-bold text-purple-900">{balances.socialFreedom} ₽</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Слайдеры */}
          <div className="space-y-6">
            {/* Personal Freedom */}
            <div>
              <div className="flex justify-between mb-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  Личная свобода
                </Label>
                <span className="font-semibold text-blue-900">{shares.personalFreedom}%</span>
              </div>
              <Slider
                value={[shares.personalFreedom]}
                onValueChange={(val) => handleShareChange('personalFreedom', val[0])}
                max={100}
                step={5}
                className="[&_[role=slider]]:bg-blue-600"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Личные расходы и саморазвитие
              </p>
            </div>

            {/* Financial Freedom */}
            <div>
              <div className="flex justify-between mb-2">
                <Label className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Финансовая свобода
                </Label>
                <span className="font-semibold text-emerald-900">{shares.financialFreedom}%</span>
              </div>
              <Slider
                value={[shares.financialFreedom]}
                onValueChange={(val) => handleShareChange('financialFreedom', val[0])}
                max={100}
                step={5}
                className="[&_[role=slider]]:bg-emerald-600"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Инвестиции и финансовая подушка
              </p>
            </div>

            {/* Time Freedom */}
            <div>
              <div className="flex justify-between mb-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Временная свобода
                </Label>
                <span className="font-semibold text-amber-900">{shares.timeFreedom}%</span>
              </div>
              <Slider
                value={[shares.timeFreedom]}
                onValueChange={(val) => handleShareChange('timeFreedom', val[0])}
                max={100}
                step={5}
                className="[&_[role=slider]]:bg-amber-600"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Пассивный доход и автоматизация
              </p>
            </div>

            {/* Social Freedom */}
            <div>
              <div className="flex justify-between mb-2">
                <Label className="flex items-center gap-2">
                  <UsersIcon className="h-4 w-4 text-purple-600" />
                  Социальная свобода
                </Label>
                <span className="font-semibold text-purple-900">{shares.socialFreedom}%</span>
              </div>
              <Slider
                value={[shares.socialFreedom]}
                onValueChange={(val) => handleShareChange('socialFreedom', val[0])}
                max={100}
                step={5}
                className="[&_[role=slider]]:bg-purple-600"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Благотворительность и социальные проекты
              </p>
            </div>
          </div>

          {/* Validation */}
          <div
            className={`p-4 rounded-lg border ${
              isValid
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {isValid ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-800">
                    Всего: {total}% ✓ Готово к сохранению
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-800">
                    Всего: {total}% (должно быть 100%)
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={!isValid || isUpdating}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            size="lg"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Сохранить настройки'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Быстрые настройки (Пресеты)</CardTitle>
          <CardDescription>
            Выберите готовый вариант распределения
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {presetsData?.presets?.map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                onClick={() => handleApplyPreset(preset.id)}
                disabled={isApplyingPreset}
                className="h-auto py-4 flex flex-col items-start"
              >
                <span className="font-semibold text-sm">{preset.name}</span>
                <span className="text-xs text-muted-foreground text-left mt-1">
                  {preset.description}
                </span>
                <span className="text-xs text-muted-foreground mt-2">
                  {preset.shares.personalFreedom}/{preset.shares.financialFreedom}/{preset.shares.timeFreedom}/{preset.shares.socialFreedom}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Simulator */}
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
        <CardHeader>
          <CardTitle className="text-base">Симулятор распределения</CardTitle>
          <CardDescription>
            Посмотрите, как будет распределён бонус с вашими текущими настройками
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Введите сумму бонуса (₽)"
              value={simulateAmount}
              onChange={(e) => setSimulateAmount(e.target.value)}
              min="0"
              step="100"
            />
            <Button onClick={handleSimulate} disabled={isSimulating} variant="secondary">
              {isSimulating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Рассчитать'
              )}
            </Button>
          </div>

          {simulationResult && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <User className="h-3 w-3" />
                  <span className="text-xs font-medium">Личная</span>
                </div>
                <p className="text-lg font-bold text-blue-900">
                  {parseFloat(simulationResult.personalFreedom.toString()).toFixed(2)} ₽
                </p>
              </div>
              <div className="bg-emerald-100 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-emerald-700 mb-1">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-xs font-medium">Финансовая</span>
                </div>
                <p className="text-lg font-bold text-emerald-900">
                  {parseFloat(simulationResult.financialFreedom.toString()).toFixed(2)} ₽
                </p>
              </div>
              <div className="bg-amber-100 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-amber-700 mb-1">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs font-medium">Временная</span>
                </div>
                <p className="text-lg font-bold text-amber-900">
                  {parseFloat(simulationResult.timeFreedom.toString()).toFixed(2)} ₽
                </p>
              </div>
              <div className="bg-purple-100 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-purple-700 mb-1">
                  <UsersIcon className="h-3 w-3" />
                  <span className="text-xs font-medium">Социальная</span>
                </div>
                <p className="text-lg font-bold text-purple-900">
                  {parseFloat(simulationResult.socialFreedom.toString()).toFixed(2)} ₽
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FreedomSharesSettings;
