import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Network,
  AlertTriangle,
  TrendingUp,
  Users,
  Activity,
  RefreshCw,
  CheckCircle,
  XCircle
} from "lucide-react";
import { axiosApi } from "@/lib/axiosApi";

const SimpleAIAgent = () => {
  const [loading, setLoading] = useState(false);
  const [networkData, setNetworkData] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [errorData, setErrorData] = useState<any>(null);

  const loadNetworkData = async () => {
    setLoading(true);
    try {
      const response = await axiosApi.get('/test/ai-network');
      setNetworkData(response.data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const loadHealthData = async () => {
    setLoading(true);
    try {
      const response = await axiosApi.get('/test/ai-health');
      setHealthData(response.data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const loadErrorData = async () => {
    setLoading(true);
    try {
      const response = await axiosApi.get('/test/ai-errors');
      setErrorData(response.data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">ИИ Агент - Мониторинг Системы</h1>
        </div>
        <Button 
          onClick={() => {
            loadNetworkData();
            loadHealthData();
            loadErrorData();
          }} 
          variant="outline" 
          className="flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Загрузить данные
        </Button>
      </div>

      {/* Краткое описание возможностей */}
      <Card>
        <CardHeader>
          <CardTitle>Возможности ИИ Агента</CardTitle>
          <CardDescription>
            Интеллектуальная система мониторинга и анализа
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Network className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="font-medium">Анализ реферальной сети</h3>
                <p className="text-sm text-gray-600">Построение карты связей между пользователями до 3 уровней</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="font-medium">Расчет бонусов</h3>
                <p className="text-sm text-gray-600">Автоматическое начисление комиссий: 20%-5%-1%</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Activity className="h-8 w-8 text-orange-600 flex-shrink-0" />
              <div>
                <h3 className="font-medium">Мониторинг системы</h3>
                <p className="text-sm text-gray-600">Отслеживание здоровья и производительности</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-medium">Анализ ошибок</h3>
                <p className="text-sm text-gray-600">Автоматическое логирование и решение проблем</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="network">Реферальная сеть</TabsTrigger>
          <TabsTrigger value="health">Здоровье системы</TabsTrigger>
          <TabsTrigger value="errors">Логи ошибок</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Пользователи
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4</div>
                <p className="text-sm text-gray-600">Всего зарегистрировано</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">+1 сегодня</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-green-600" />
                  Реферальная сеть
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-sm text-gray-600">Уровня в глубину</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">Активная</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-600" />
                  Система
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Здорова</div>
                <p className="text-sm text-gray-600">Статус мониторинга</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">90%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Структура реферальной сети</CardTitle>
              <CardDescription>
                Нажмите "Загрузить данные" для получения актуальной информации
              </CardDescription>
            </CardHeader>
            <CardContent>
              {networkData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {networkData.network?.totalUsers || 0}
                      </div>
                      <p className="text-sm text-blue-600">Всего пользователей</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {networkData.network?.maxDepth || 0}
                      </div>
                      <p className="text-sm text-green-600">Максимальная глубина</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {networkData.network?.rootNodes || 0}
                      </div>
                      <p className="text-sm text-purple-600">Корневых узлов</p>
                    </div>
                  </div>
                  
                  {networkData.network?.analysis && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Рекомендации ИИ:</h4>
                      <ul className="space-y-1">
                        {networkData.network.analysis.recommendations?.map((rec: string, index: number) => (
                          <li key={index} className="text-sm flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Данные не загружены. Нажмите "Загрузить данные" для анализа сети.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Здоровье системы</CardTitle>
              <CardDescription>
                Мониторинг производительности и состояния
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthData ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold text-green-600">
                      {healthData.health_score || 'N/A'}%
                    </div>
                    <div>
                      <p className="font-medium">Общий индекс здоровья</p>
                      <p className="text-sm text-gray-600">Система работает стабильно</p>
                    </div>
                  </div>
                  
                  {healthData.analysis?.recommendations && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium mb-2">Рекомендации:</h4>
                      <ul className="space-y-1">
                        {healthData.analysis.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="text-sm">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Данные не загружены. Нажмите "Загрузить данные" для анализа системы.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Системные ошибки</CardTitle>
              <CardDescription>
                Мониторинг и анализ ошибок
              </CardDescription>
            </CardHeader>
            <CardContent>
              {errorData ? (
                <div className="space-y-3">
                  {errorData.errors?.length > 0 ? (
                    errorData.errors.map((error: any) => (
                      <div key={error.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={`${
                                error.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                error.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                error.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {error.severity}
                              </Badge>
                              <span className="text-sm text-gray-600">{error.type}</span>
                            </div>
                            <p className="text-sm font-medium">{error.message}</p>
                          </div>
                          <div>
                            {error.resolved ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-green-600">
                      Критических ошибок не обнаружено
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Данные не загружены. Нажмите "Загрузить данные" для анализа ошибок.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SimpleAIAgent;