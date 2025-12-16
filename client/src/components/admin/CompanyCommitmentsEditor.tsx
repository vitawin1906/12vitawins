import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { X, Save } from "lucide-react";
import { useGetCompanyCommitmentsQuery, useUpdateCompanyCommitmentsMutation } from "@/store/api/domains";

interface CompanyCommitmentsEditorProps {
  onClose: () => void;
}

interface CompanyCommitmentsData {
  title: string;
  subtitle: string;
  description1: string;
  description2: string;
  promise_title: string;
  promise_text: string;
  guarantee_button_text: string;
  guarantee_button_url: string;
}

const CompanyCommitmentsEditor = ({ onClose }: CompanyCommitmentsEditorProps) => {
  const [formData, setFormData] = useState<CompanyCommitmentsData>({
    title: "Наши обязательства по качеству",
    subtitle: "Высочайшие стандарты",
    description1: "В VitaWin мы стремимся предоставлять витамины и минералы, БАДы и пищевые добавки высочайшего качества. Наша продукция производится на собственном предприятии в Санкт-Петербурге, зарегистрировано в ЕАС, которые следуют строгим рекомендациям надлежащей производственной практики (GMP).",
    description2: "Каждая партия наших добавок проходит строгое тестирование на чистоту, эффективность и качество. Мы сами выращиваем и закупаем ингредиенты у проверенных поставщиков, которые разделяют наши обязательства по качеству и устойчивости.",
    promise_title: "Наше обещание",
    promise_text: "Мы поддерживаем нашу продукцию 100% гарантией удовлетворения. Если вы не полностью удовлетворены покупкой, мы вернем деньги или заменим товар.",
    guarantee_button_text: "Получить гарантию качества",
    guarantee_button_url: "#"
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();

  // Загрузка текущих настроек
  const { data: commitments = [] } = useGetCompanyCommitmentsQuery();
  const [updateCommitments, { isLoading: isSaving }] = useUpdateCompanyCommitmentsMutation();

  // Обновление формы при загрузке данных
  useEffect(() => {
    const commitmentsData = commitments[0];
    if (commitmentsData) {
      setFormData({
        title: (commitmentsData as any).title || "Наши обязательства по качеству",
        subtitle: (commitmentsData as any).subtitle || "Высочайшие стандарты",
        description1: (commitmentsData as any).description1 || "В VitaWin мы стремимся предоставлять витамины и минералы, БАДы и пищевые добавки высочайшего качества. Наша продукция производится на собственном предприятии в Санкт-Петербурге, зарегистрировано в ЕАС, которые следуют строгим рекомендациям надлежащей производственной практики (GMP).",
        description2: (commitmentsData as any).description2 || "Каждая партия наших добавок проходит строгое тестирование на чистоту, эффективность и качество. Мы сами выращиваем и закупаем ингредиенты у проверенных поставщиков, которые разделяют наши обязательства по качеству и устойчивости.",
        promise_title: (commitmentsData as any).promise_title || "Наше обещание",
        promise_text: (commitmentsData as any).promise_text || "Мы поддерживаем нашу продукцию 100% гарантией удовлетворения. Если вы не полностью удовлетворены покупкой, мы вернем деньги или заменим товар.",
        guarantee_button_text: (commitmentsData as any).guarantee_button_text || "Получить гарантию качества",
        guarantee_button_url: (commitmentsData as any).guarantee_button_url || "#"
      });
    }
  }, [commitments]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Проверяем, что все поля заполнены
    Object.entries(formData).forEach(([key, value]) => {
      if (!value.trim()) {
        newErrors[key] = 'Поле обязательно для заполнения';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CompanyCommitmentsData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Очищаем ошибку для этого поля
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      await updateCommitments([{
        title: formData.title,
        subtitle: formData.subtitle,
        description1: formData.description1,
        description2: formData.description2,
        promise_title: formData.promise_title,
        promise_text: formData.promise_text,
        guarantee_button_text: formData.guarantee_button_text,
        guarantee_button_url: formData.guarantee_button_url,
      }]).unwrap();

      toast({
        title: "Успешно",
        description: "Настройки компании обновлены",
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error?.data?.message || 'Ошибка при сохранении',
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Редактирование настроек компании</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid gap-6">
            <div>
              <Label htmlFor="title">Заголовок раздела</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <Label htmlFor="subtitle">Подзаголовок</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => handleInputChange('subtitle', e.target.value)}
                className={errors.subtitle ? 'border-red-500' : ''}
              />
              {errors.subtitle && (
                <p className="text-sm text-red-500 mt-1">{errors.subtitle}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description1">Первое описание</Label>
              <Textarea
                id="description1"
                rows={4}
                value={formData.description1}
                onChange={(e) => handleInputChange('description1', e.target.value)}
                className={errors.description1 ? 'border-red-500' : ''}
              />
              {errors.description1 && (
                <p className="text-sm text-red-500 mt-1">{errors.description1}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description2">Второе описание</Label>
              <Textarea
                id="description2"
                rows={4}
                value={formData.description2}
                onChange={(e) => handleInputChange('description2', e.target.value)}
                className={errors.description2 ? 'border-red-500' : ''}
              />
              {errors.description2 && (
                <p className="text-sm text-red-500 mt-1">{errors.description2}</p>
              )}
            </div>

            <div>
              <Label htmlFor="promise_title">Заголовок обещания</Label>
              <Input
                id="promise_title"
                value={formData.promise_title}
                onChange={(e) => handleInputChange('promise_title', e.target.value)}
                className={errors.promise_title ? 'border-red-500' : ''}
              />
              {errors.promise_title && (
                <p className="text-sm text-red-500 mt-1">{errors.promise_title}</p>
              )}
            </div>

            <div>
              <Label htmlFor="promise_text">Текст обещания</Label>
              <Textarea
                id="promise_text"
                rows={3}
                value={formData.promise_text}
                onChange={(e) => handleInputChange('promise_text', e.target.value)}
                className={errors.promise_text ? 'border-red-500' : ''}
              />
              {errors.promise_text && (
                <p className="text-sm text-red-500 mt-1">{errors.promise_text}</p>
              )}
            </div>

            <div>
              <Label htmlFor="guarantee_button_text">Текст кнопки гарантии</Label>
              <Input
                id="guarantee_button_text"
                value={formData.guarantee_button_text}
                onChange={(e) => handleInputChange('guarantee_button_text', e.target.value)}
                className={errors.guarantee_button_text ? 'border-red-500' : ''}
              />
              {errors.guarantee_button_text && (
                <p className="text-sm text-red-500 mt-1">{errors.guarantee_button_text}</p>
              )}
            </div>

            <div>
              <Label htmlFor="guarantee_button_url">Ссылка кнопки гарантии</Label>
              <Input
                id="guarantee_button_url"
                value={formData.guarantee_button_url}
                onChange={(e) => handleInputChange('guarantee_button_url', e.target.value)}
                className={errors.guarantee_button_url ? 'border-red-500' : ''}
                placeholder="https://vitawin.site или #"
              />
              {errors.guarantee_button_url && (
                <p className="text-sm text-red-500 mt-1">{errors.guarantee_button_url}</p>
              )}
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyCommitmentsEditor;