import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Network, ArrowLeft, ArrowRight, TrendingUp, Users } from 'lucide-react';
import { useGetMyPlacementQuery } from '@/store/api/domains/matrixPlacementApi';
import { calculateLegBalance, formatPV } from '@/utils/matrix/calculations';
import { Link } from 'react-router-dom';

export function MyMatrixSection() {
  const { data, isLoading, error } = useGetMyPlacementQuery();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Ошибка загрузки данных матрицы. Попробуйте обновить страницу.
        </AlertDescription>
      </Alert>
    );
  }

  if (!data?.placement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Бинарная матрица
          </CardTitle>
          <CardDescription>
            Вы ещё не размещены в матрице
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Размещение в матрице происходит автоматически при первой покупке или регистрации по реферальной ссылке.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { placement, children } = data;
  const legBalance = calculateLegBalance(placement.leftLegVolume, placement.rightLegVolume);

  return (
    <div className="space-y-6">
      {/* Основная информация */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Моя позиция в матрице
              </CardTitle>
              <CardDescription>
                Уровень {placement.level} • Позиция: {placement.position === 'left' ? 'Левая' : 'Правая'}
              </CardDescription>
            </div>
            <Badge variant={placement.isActive ? 'default' : 'secondary'}>
              {placement.isActive ? 'Активна' : 'Неактивна'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Статистика ног */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Левая нога */}
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Левая нога</span>
                </div>
                {legBalance.strongerLeg === 'left' && (
                  <Badge variant="default" className="bg-blue-600">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Сильнее
                  </Badge>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-gray-600">Объём PV:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatPV(placement.leftLegVolume)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-gray-600">Участников:</span>
                  <span className="font-medium">{placement.leftLegCount}</span>
                </div>
              </div>

              <Progress
                value={(legBalance.left / legBalance.total) * 100}
                className="h-2"
              />
            </div>

            {/* Правая нога */}
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium">Правая нога</span>
                </div>
                {legBalance.strongerLeg === 'right' && (
                  <Badge variant="default" className="bg-emerald-600">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Сильнее
                  </Badge>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-gray-600">Объём PV:</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {formatPV(placement.rightLegVolume)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-gray-600">Участников:</span>
                  <span className="font-medium">{placement.rightLegCount}</span>
                </div>
              </div>

              <Progress
                value={(legBalance.right / legBalance.total) * 100}
                className="h-2"
              />
            </div>
          </div>

          {/* Баланс ног */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Баланс ног:</span>
              <span className="text-lg font-bold">
                {legBalance.balancePercent.toFixed(1)}%
              </span>
            </div>
            <Progress value={legBalance.balancePercent} className="h-2" />
            <p className="text-xs text-gray-600 mt-2">
              {legBalance.strongerLeg === 'balanced'
                ? 'Ваши ноги идеально сбалансированы!'
                : `${legBalance.strongerLeg === 'left' ? 'Левая' : 'Правая'} нога сильнее на ${formatPV(legBalance.difference)} PV`
              }
            </p>
          </div>

          {/* Прямые рефералы */}
          {children && children.length > 0 && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4" />
                <span className="font-medium">Прямые рефералы: {children.length}</span>
              </div>
              <div className="flex gap-2">
                {children.map((child, idx) => (
                  <Badge key={idx} variant="outline">
                    {child.position === 'left' ? '← Левый' : 'Правый →'}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Кнопка детального просмотра */}
          <Button asChild className="w-full">
            <Link to="/account/matrix-full">
              <Network className="h-4 w-4 mr-2" />
              Открыть полную визуализацию матрицы
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Информационная карточка */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">О бинарной матрице</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>Бинарная матрица</strong> - это структура размещения участников сети, где каждый может иметь до 2-х прямых рефералов (левый и правый).
          </p>
          <p>
            <strong>PV (Point Value)</strong> - объёмные очки, которые начисляются за покупки в вашей структуре.
          </p>
          <p>
            <strong>Баланс ног</strong> - соотношение объёмов между левой и правой ногой влияет на размер бинарных бонусов.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
