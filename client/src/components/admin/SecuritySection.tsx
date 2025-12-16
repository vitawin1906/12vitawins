import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useChangePasswordMutation } from '@/store/api/domains';

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const SecuritySection = () => {
  const [formData, setFormData] = useState<ChangePasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { toast } = useToast();
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Введите текущий пароль';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'Введите новый пароль';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Пароль должен содержать минимум 6 символов';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Подтвердите новый пароль';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'Новый пароль должен отличаться от текущего';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      }).unwrap();

      toast({
        title: "Успешно",
        description: 'Пароль успешно изменен',
        variant: "default",
      });

      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setErrors({});
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error?.data?.message || 'Ошибка при смене пароля',
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: keyof ChangePasswordData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Очистить ошибку для этого поля при изменении
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Безопасность
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Смена пароля</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Текущий пароль */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Текущий пароль</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                  placeholder="Введите текущий пароль"
                  className={errors.currentPassword ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                  onClick={() => togglePasswordVisibility('current')}
                >
                  {showPasswords.current ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {errors.currentPassword && (
                <p className="text-sm text-red-500">{errors.currentPassword}</p>
              )}
            </div>

            {/* Новый пароль */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">Новый пароль</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  placeholder="Введите новый пароль"
                  className={errors.newPassword ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                  onClick={() => togglePasswordVisibility('new')}
                >
                  {showPasswords.new ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {errors.newPassword && (
                <p className="text-sm text-red-500">{errors.newPassword}</p>
              )}
            </div>

            {/* Подтверждение пароля */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Подтверждение пароля</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Подтвердите новый пароль"
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                  onClick={() => togglePasswordVisibility('confirm')}
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Рекомендации по безопасности */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Рекомендации:</strong>
                <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
                  <li>Используйте пароль длиной минимум 8 символов</li>
                  <li>Включите заглавные и строчные буквы, цифры</li>
                  <li>Не используйте личную информацию в пароле</li>
                  <li>Регулярно меняйте пароль</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Кнопка отправки */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Изменение пароля...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Изменить пароль
                </>
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecuritySection;