
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useContactStore } from '@/store/contactStore';
import { MapPin, Phone, Clock, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const ContactManagement = () => {
  const { contactInfo, updateContactInfo } = useContactStore();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    pageTitle: contactInfo.pageTitle,
    pageDescription: contactInfo.pageDescription,
    address: contactInfo.address,
    phone: contactInfo.phone,
    email: contactInfo.email,
    workingHours: {
      weekdays: contactInfo.workingHours.weekdays,
      weekends: contactInfo.workingHours.weekends
    },
    coordinates: {
      latitude: contactInfo.coordinates.latitude,
      longitude: contactInfo.coordinates.longitude
    }
  });

  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as object),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleCoordinateChange = (coord: 'latitude' | 'longitude', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setFormData(prev => ({
        ...prev,
        coordinates: {
          ...prev.coordinates,
          [coord]: numValue
        }
      }));
    }
  };

  const handleSave = () => {
    updateContactInfo(formData);
    toast({
      title: "Настройки сохранены",
      description: "Контактная информация успешно обновлена",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Управление страницей контактов</h2>
        <p className="text-gray-600 mt-2">Редактирование контактной информации и настроек страницы</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Основная информация */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Основная информация
            </CardTitle>
            <CardDescription>
              Основные контактные данные компании
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pageTitle">Заголовок страницы</Label>
              <Input
                id="pageTitle"
                value={formData.pageTitle}
                onChange={(e) => handleInputChange('pageTitle', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="pageDescription">Описание страницы</Label>
              <Textarea
                id="pageDescription"
                value={formData.pageDescription}
                onChange={(e) => handleInputChange('pageDescription', e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="address">Адрес производства</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Часы работы и координаты */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Режим работы и расположение
            </CardTitle>
            <CardDescription>
              Часы работы и координаты для карты
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="weekdays">Будние дни</Label>
              <Input
                id="weekdays"
                value={formData.workingHours.weekdays}
                onChange={(e) => handleInputChange('workingHours.weekdays', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="weekends">Выходные дни</Label>
              <Input
                id="weekends"
                value={formData.workingHours.weekends}
                onChange={(e) => handleInputChange('workingHours.weekends', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Координаты для карты</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="latitude" className="text-sm">Широта</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.coordinates.latitude}
                    onChange={(e) => handleCoordinateChange('latitude', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="longitude" className="text-sm">Долгота</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.coordinates.longitude}
                    onChange={(e) => handleCoordinateChange('longitude', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={handleSave} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Сохранить изменения
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Предварительный просмотр карты */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Предварительный просмотр расположения
          </CardTitle>
          <CardDescription>
            Текущие координаты: {formData.coordinates.latitude}, {formData.coordinates.longitude}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Интерактивная карта</p>
              <p className="text-sm text-gray-400">{formData.address}</p>
              <p className="text-xs text-gray-400 mt-1">
                Координаты: {formData.coordinates.latitude}, {formData.coordinates.longitude}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
