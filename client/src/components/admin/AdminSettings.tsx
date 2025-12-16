import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeliverySettings } from './DeliverySettings';
import { SiteSettings } from './SiteSettings';
import TelegramSettings from './TelegramSettings';
import { Settings, Package, Code, MessageCircle } from 'lucide-react';

export function AdminSettings() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="w-8 h-8" />
          Настройки системы
        </h1>
        <p className="text-muted-foreground">
          Управление API ключами, скриптами и интеграциями
        </p>
      </div>

      <Tabs defaultValue="delivery" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Доставка
          </TabsTrigger>
          <TabsTrigger value="scripts" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            Скрипты
          </TabsTrigger>
          <TabsTrigger value="telegram" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Telegram
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Общие
          </TabsTrigger>
        </TabsList>

        <TabsContent value="delivery">
          <DeliverySettings />
        </TabsContent>

        <TabsContent value="scripts">
          <SiteSettings />
        </TabsContent>

        <TabsContent value="telegram">
          <TelegramSettings />
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Общие настройки</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Дополнительные настройки системы будут добавлены здесь.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}