
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { UserCog, KeyRound, Mail, Phone, MessageCircle, User, Loader2 } from "lucide-react";
import {useAuthStore} from "@/stores";
import { useUpdateMyProfileMutation } from "@/store/api/domains/usersApi";

const AccountSettings = () => {
  const user = useAuthStore(state => state.user);
  const setUser = useAuthStore(state => state.setUser);
  const { toast } = useToast();

  // ✅ RTK Query mutation для обновления профиля
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateMyProfileMutation();
  
  // Set up forms for different sections
  const profileForm = useForm({
    defaultValues: {
      name: user?.firstName || "",
      surname: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      telegram: user?.username || "",
      telegramId: user?.telegramId || "",
    },
  });

  // Обновляем форму при изменении данных пользователя
  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.firstName || "",
        surname: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        telegram: user.username || "",
        telegramId: user.telegramId?.toString() || "",
      });
    }
  }, [user, profileForm]);
  
  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onProfileSubmit = async (values: any) => {
    if (!user) return;

    try {
      // ✅ Отправляем данные на бэкенд через RTK Query
      const updatedUser = await updateProfile({
        firstName: values.name,
        lastName: values.surname,
        email: values.email,
        phone: values.phone,
      }).unwrap();

      // ✅ Обновляем локальный стор после успешного сохранения
      setUser(updatedUser);

      toast({
        title: "Профиль обновлен",
        description: "Информация вашего профиля была успешно обновлена.",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка обновления",
        description: error?.data?.message || "Не удалось обновить профиль",
        variant: "destructive",
      });
    }
  };

  const onPasswordSubmit = async (values: any) => {
    // TODO: Добавить API endpoint для смены пароля
    // Пока показываем предупреждение
    toast({
      title: "Функция в разработке",
      description: "Смена пароля будет доступна в следующей версии.",
      variant: "default",
    });

    passwordForm.reset();
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Настройки аккаунта</h2>
      
      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <UserCog className="h-5 w-5 mr-2 text-blue-500" />
            Личная информация
          </CardTitle>
          <CardDescription>
            Обновите ваши личные данные
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Имя</FormLabel>
                      <div className="flex items-center">
                        <FormControl>
                          <div className="relative flex-1">
                            <Input placeholder="Ваше имя" {...field} />
                            <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={profileForm.control}
                  name="surname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Фамилия</FormLabel>
                      <div className="flex items-center">
                        <FormControl>
                          <div className="relative flex-1">
                            <Input placeholder="Ваша фамилия" {...field} />
                            <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={profileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email адрес</FormLabel>
                    <div className="flex items-center">
                      <FormControl>
                        <div className="relative flex-1">
                          <Input placeholder="Ваш email" {...field} />
                          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={profileForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер телефона</FormLabel>
                    <div className="flex items-center">
                      <FormControl>
                        <div className="relative flex-1">
                          <Input placeholder="+7 (999) 123-45-67" {...field} />
                          <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={profileForm.control}
                name="telegram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telegram аккаунт</FormLabel>
                    <div className="flex items-center">
                      <FormControl>
                        <div className="relative flex-1">
                          <Input placeholder="@username" {...field} />
                          <MessageCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={profileForm.control}
                name="telegramId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telegram ID</FormLabel>
                    <div className="flex items-center">
                      <FormControl>
                        <div className="relative flex-1">
                          <Input placeholder="Ваш Telegram ID" {...field} disabled />
                          <MessageCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={isUpdatingProfile}>
                  {isUpdatingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    "Сохранить изменения"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <KeyRound className="h-5 w-5 mr-2 text-amber-500" />
            Изменить пароль
          </CardTitle>
          <CardDescription>
            Регулярно обновляйте пароль для безопасности аккаунта
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Текущий пароль</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Ваш текущий пароль" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Новый пароль</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Новый пароль" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Подтвердите новый пароль</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Подтвердите новый пароль" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="pt-4 flex justify-end">
                <Button type="submit">
                  Изменить пароль
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Account Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Настройки аккаунта
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Email уведомления</h4>
                <p className="text-sm text-gray-500">
                  Получать обновления заказов и рекламные предложения
                </p>
              </div>
              <div className="flex items-center h-5">
                <input
                  id="email-notifications"
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">SMS уведомления</h4>
                <p className="text-sm text-gray-500">
                  Получать обновления доставки через SMS
                </p>
              </div>
              <div className="flex items-center h-5">
                <input
                  id="sms-notifications"
                  type="checkbox"
                  defaultChecked={false}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Двухфакторная аутентификация</h4>
                <p className="text-sm text-gray-500">
                  Добавить дополнительный уровень безопасности к вашему аккаунту
                </p>
              </div>
              <Button variant="outline" size="sm">
                Включить
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-lg text-red-600">Опасная зона</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Удалить аккаунт</h4>
                <p className="text-sm text-gray-500">
                  Это действие нельзя отменить. Все ваши данные будут безвозвратно удалены.
                </p>
              </div>
              <Button variant="destructive" size="sm">
                Удалить аккаунт
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSettings;
