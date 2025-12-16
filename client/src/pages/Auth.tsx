import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useGetMeQuery } from '@/store/api/domains/authApi';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, setTokens } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();

  // Получаем токен из URL (поддерживаем оба варианта: token и authToken)
  const token = searchParams.get('token') || searchParams.get('authToken');

  // Вызываем /auth/me только если токен есть
  const { data: userData, isSuccess, isError, error } = useGetMeQuery(undefined, {
    skip: !token,
  });

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Токен авторизации не найден в URL');
      return;
    }

    // Сразу сохраняем токен в Zustand
    console.log('Сохраняем токен:', token.substring(0, 20) + '...');
    setTokens(token);
  }, [token, setTokens]);

  useEffect(() => {
    if (isSuccess && userData) {
      console.log('Данные пользователя получены:', userData);
      setUser(userData);
      setStatus('success');

      toast({
        title: "Успешная авторизация!",
        description: `Добро пожаловать, ${userData.firstName}!`,
      });

      // Перенаправляем через 2 секунды
      setTimeout(() => {
        navigate('/account', { replace: true });
      }, 2000);
    }

    if (isError) {
      console.error('Ошибка авторизации:', error);
      setStatus('error');
      setErrorMessage((error as any)?.data?.message || 'Ошибка соединения с сервером');
    }
  }, [isSuccess, isError, userData, error, setUser, navigate, toast]);

  const handleRetry = () => {
    navigate('/');
  };

  const handleGoToTelegram = () => {
    window.open('https://t.me/vitawin_bot?start=auth', '_blank');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              Авторизация
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Проверяем ваш токен авторизации...
            </p>
            <Button
              onClick={() => {
                const ref = searchParams.get('ref') || '';
                const qs = ref ? `?ref=${encodeURIComponent(ref)}` : '';
                window.location.href = `/api/auth/google/init${qs}`;
              }}
              className="w-full"
            >
              Войти через Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              Успешно!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Вы успешно авторизованы в VitaWin!
            </p>
            <p className="text-sm text-gray-500">
              Перенаправляем вас в личный кабинет...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-red-600">
            <XCircle className="h-6 w-6" />
            Ошибка авторизации
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            {errorMessage}
          </p>
          <div className="space-y-2">
            <Button
              onClick={handleGoToTelegram}
              className="w-full"
              variant="default"
            >
              🤖 Получить новый токен в боте
            </Button>
            <Button
              onClick={handleRetry}
              variant="outline"
              className="w-full"
            >
              🏠 Вернуться на главную
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
