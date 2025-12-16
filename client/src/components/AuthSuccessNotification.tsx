import { useState, useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const AuthSuccessNotification = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [redirectMessage, setRedirectMessage] = useState('');

  useEffect(() => {
    const handleAuthSuccess = (event: CustomEvent) => {
      const { detail } = event;
      setMessage(detail.message || 'Авторизация успешна!');
      setRedirectMessage(detail.redirect || '');
      setIsVisible(true);

      // Автоматически скрываем через 3 секунды
      setTimeout(() => {
        setIsVisible(false);
      }, 3000);
    };

    window.addEventListener('auth-success', handleAuthSuccess as EventListener);

    return () => {
      window.removeEventListener('auth-success', handleAuthSuccess as EventListener);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
      <Card className="w-80 bg-green-50 border-green-200 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-green-100 p-1 flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-800 text-sm">
                Успешно!
              </h3>
              <p className="text-green-700 text-sm mt-1">
                {message}
              </p>
              {redirectMessage && (
                <p className="text-green-600 text-xs mt-2 italic">
                  {redirectMessage}
                </p>
              )}
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-green-600 hover:text-green-800 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthSuccessNotification;