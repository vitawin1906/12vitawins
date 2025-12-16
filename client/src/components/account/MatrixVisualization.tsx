import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Network, ChevronDown, ChevronUp } from 'lucide-react';
import { useGetMyPlacementQuery, useGetMyDownlineQuery, useGetMyUplineQuery } from '@/store/api/domains/matrixPlacementApi';
import { formatPV } from '@/utils/matrix/calculations';

export function MatrixVisualization() {
  const [showDownline, setShowDownline] = useState(false);
  const [maxDepth, setMaxDepth] = useState(3);

  const { data: placement, isLoading: loadingPlacement } = useGetMyPlacementQuery();
  const { data: downline, isLoading: loadingDownline } = useGetMyDownlineQuery({ maxDepth }, { skip: !showDownline });
  const { data: upline, isLoading: loadingUpline } = useGetMyUplineQuery();

  if (loadingPlacement) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!placement?.placement) {
    return (
      <Alert>
        <AlertDescription>
          Вы ещё не размещены в матрице. Размещение происходит автоматически при первой покупке.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upline (путь до root) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Upline (Восходящая линия)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingUpline ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : upline && upline.upline.length > 0 ? (
            <div className="space-y-2">
              {upline.upline.map((node, idx) => (
                <div key={idx} className="p-3 border rounded-lg flex items-center justify-between">
                  <span className="text-sm">Уровень {node.level}</span>
                  <span className="text-xs text-gray-600">{node.position === 'left' ? 'Левая ветка' : 'Правая ветка'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">Вы находитесь в корне матрицы</p>
          )}
        </CardContent>
      </Card>

      {/* Текущая позиция */}
      <Card className="border-2 border-emerald-500">
        <CardHeader>
          <CardTitle>Ваша позиция (Уровень {placement.placement.level})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Левая нога</p>
              <p className="text-2xl font-bold text-blue-600">{formatPV(placement.placement.leftLegVolume)}</p>
              <p className="text-xs text-gray-600">{placement.placement.leftLegCount} участников</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-lg">
              <p className="text-sm text-gray-600">Правая нога</p>
              <p className="text-2xl font-bold text-emerald-600">{formatPV(placement.placement.rightLegVolume)}</p>
              <p className="text-xs text-gray-600">{placement.placement.rightLegCount} участников</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Downline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Downline (Нисходящая линия)</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDownline(!showDownline)}
            >
              {showDownline ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
              {showDownline ? 'Скрыть' : 'Показать'}
            </Button>
          </div>
        </CardHeader>
        {showDownline && (
          <CardContent>
            {loadingDownline ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : downline && downline.downline.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-600">Глубина просмотра:</span>
                  {[3, 5, 10].map((depth) => (
                    <Button
                      key={depth}
                      variant={maxDepth === depth ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMaxDepth(depth)}
                    >
                      {depth} уровней
                    </Button>
                  ))}
                </div>

                <p className="text-sm font-medium mb-2">Всего участников: {downline.count}</p>

                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {downline.downline.map((node, idx) => (
                    <div key={idx} className="p-2 border rounded flex items-center justify-between text-sm">
                      <span>Уровень {node.level}</span>
                      <span className="text-xs text-gray-600">
                        {node.position === 'left' ? '← Левая' : 'Правая →'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">У вас пока нет downline</p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
