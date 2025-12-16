import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Shield, Activity, Clock, MapPin, Monitor } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { axiosApi } from '@/lib/axiosApi';

interface AdminSession {
  id: string;
  admin_id: string;
  session_token: string;
  ip_address: string;
  user_agent: string;
  login_time: string;
  last_activity: string;
  logout_time?: string;
  is_active: boolean;
  location: string;
  device_info: any;
  admin: {
    id: string;
    email: string;
  };
}

interface AdminActivity {
  id: string;
  admin_id: string;
  session_id?: string;
  action: string;
  resource?: string;
  resource_id?: string;
  details: any;
  ip_address: string;
  timestamp: string;
}

interface RealtimeStats {
  activeSessions: number;
  totalLogins: number;
  recentActivities: AdminActivity[];
  sessionsByLocation: { location: string; count: number }[];
}

export default function AdminSessionMonitor() {
  const [activeSessions, setActiveSessions] = useState<AdminSession[]>([]);
  const [recentActivities, setRecentActivities] = useState<AdminActivity[]>([]);
  const [stats, setStats] = useState<RealtimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);

      const [sessionsRes, activitiesRes, statsRes] = await Promise.all([
        axiosApi.get('/admin/sessions/active'),
        axiosApi.get('/admin/activity-log?limit=10'),
        axiosApi.get('/admin/realtime-stats')
      ]);

      setActiveSessions(sessionsRes.data.sessions || []);
      setRecentActivities(activitiesRes.data.activities || []);
      setStats(statsRes.data.stats);
    } catch (error) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cleanupInactiveSessions = async () => {
    try {
      await axiosApi.post('/admin/cleanup-sessions');
      fetchData(); // Refresh data after cleanup
    } catch (error) {
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getDeviceType = (userAgent: string) => {
    if (userAgent.includes('Mobile')) return 'Мобильный';
    if (userAgent.includes('Tablet')) return 'Планшет';
    return 'Компьютер';
  };

  const getBrowser = (userAgent: string) => {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Неизвестный';
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'login': return 'bg-green-100 text-green-800';
      case 'logout': return 'bg-red-100 text-red-800';
      case 'view': return 'bg-blue-100 text-blue-800';
      case 'create': return 'bg-purple-100 text-purple-800';
      case 'update': return 'bg-orange-100 text-orange-800';
      case 'delete': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
        <span className="ml-2 text-gray-600">Загрузка данных мониторинга...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm text-gray-600">Активные сессии</p>
                <p className="text-2xl font-bold text-emerald-600">{stats?.activeSessions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Входов сегодня</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.totalLogins || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Последняя активность</p>
                <p className="text-sm font-medium text-orange-600">
                  {recentActivities[0] && formatDistanceToNow(new Date(recentActivities[0].timestamp), { 
                    addSuffix: true, 
                    locale: ru 
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Локации</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats?.sessionsByLocation?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Мониторинг доступа администраторов</CardTitle>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={cleanupInactiveSessions}
            >
              Очистить неактивные
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Monitor className="h-5 w-5" />
              <span>Активные сессии ({activeSessions.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeSessions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Нет активных сессий</p>
              ) : (
                activeSessions.map((session) => (
                  <div key={session.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{session.admin.email}</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Активен
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">IP:</span> {session.ip_address}
                      </div>
                      <div>
                        <span className="font-medium">Локация:</span> {session.location}
                      </div>
                      <div>
                        <span className="font-medium">Устройство:</span> {getDeviceType(session.user_agent)}
                      </div>
                      <div>
                        <span className="font-medium">Браузер:</span> {getBrowser(session.user_agent)}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      <div>Вход: {formatDistanceToNow(new Date(session.login_time), { addSuffix: true, locale: ru })}</div>
                      <div>Активность: {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true, locale: ru })}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Последние действия</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Нет записей активности</p>
              ) : (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Badge className={getActionColor(activity.action)}>
                      {activity.action}
                    </Badge>
                    
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {activity.resource && (
                          <span className="text-gray-600">{activity.resource}</span>
                        )}
                        {activity.resource_id && (
                          <span className="text-gray-500"> #{activity.resource_id}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        IP: {activity.ip_address} • {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: ru })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions by Location */}
      {stats?.sessionsByLocation && stats.sessionsByLocation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Сессии по локациям</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.sessionsByLocation.map((location, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{location.location}</span>
                  <Badge variant="outline">{location.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}