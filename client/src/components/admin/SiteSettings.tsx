import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, Code, AlertTriangle } from 'lucide-react';
import { axiosApi } from '@/lib/axiosApi';

interface SiteScripts {
  head_scripts: string;
  body_scripts: string;
}

export function SiteSettings() {
  const [scripts, setScripts] = useState<SiteScripts>({
    head_scripts: '',
    body_scripts: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    setLoading(true);
    try {
      const response = await axiosApi.get('/admin/site-settings');
      setScripts(response.data.scripts || { head_scripts: '', body_scripts: '' });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить настройки скриптов',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveScripts = async () => {
    setSaving(true);
    try {
      await axiosApi.post('/admin/site-settings', { scripts });
      toast({
        title: 'Успешно сохранено',
        description: 'Настройки скриптов обновлены'
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: `Не удалось сохранить настройки: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleScriptChange = (field: keyof SiteScripts, value: string) => {
    setScripts(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Загрузка настроек...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Кастомные скрипты и теги
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Предупреждение */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Важно!</h4>
                <p className="text-sm text-yellow-700">
                  Будьте осторожны при добавлении кастомных скриптов. Неправильный код может нарушить работу сайта.
                  Всегда тестируйте изменения перед публикацией.
                </p>
              </div>
            </div>
          </div>

          {/* Head скрипты */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-medium">Скрипты для &lt;head&gt;</Label>
              <p className="text-sm text-muted-foreground">
                Код будет вставлен в секцию &lt;head&gt; на всех страницах сайта.
                Подходит для мета-тегов, CSS, аналитики и других скриптов, которые должны загружаться в начале.
              </p>
            </div>
            <Textarea
              value={scripts.head_scripts}
              onChange={(e) => handleScriptChange('head_scripts', e.target.value)}
              placeholder={`<!-- Пример содержимого для <head> -->
<meta name="description" content="Описание сайта">
<meta name="keywords" content="ключевые, слова">

<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_TRACKING_ID');
</script>

<!-- Дополнительные CSS -->
<style>
  /* Ваши стили */
</style>`}
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          {/* Body скрипты */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-medium">Скрипты для &lt;/body&gt;</Label>
              <p className="text-sm text-muted-foreground">
                Код будет вставлен перед закрывающим тегом &lt;/body&gt; на всех страницах.
                Подходит для JavaScript кода, виджетов, счетчиков и скриптов, которые должны загружаться в конце.
              </p>
            </div>
            <Textarea
              value={scripts.body_scripts}
              onChange={(e) => handleScriptChange('body_scripts', e.target.value)}
              placeholder={`<!-- Пример содержимого для </body> -->

<!-- Яндекс.Метрика -->
<script type="text/javascript">
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

   ym(COUNTER_ID, "init", {
        clickmap:true,
        trackLinks:true,
        accurateTrackBounce:true
   });
</script>

<!-- Онлайн чат -->
<script>
  // Код виджета чата
</script>

<!-- Дополнительные скрипты -->
<script>
  // Ваш JavaScript код
</script>`}
              rows={15}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={saveScripts} disabled={saving}>
              {saving ? (
                <>
                  <Save className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить настройки
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Примеры использования */}
      <Card>
        <CardHeader>
          <CardTitle>Примеры использования</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium">Google Analytics 4</h4>
            <p className="text-sm text-muted-foreground">
              Добавьте код отслеживания GA4 в секцию &lt;head&gt; для анализа трафика
            </p>
          </div>
          <div>
            <h4 className="font-medium">Яндекс.Метрика</h4>
            <p className="text-sm text-muted-foreground">
              Код счетчика Яндекс.Метрики размещается в секции &lt;/body&gt;
            </p>
          </div>
          <div>
            <h4 className="font-medium">Пиксель Facebook/VK</h4>
            <p className="text-sm text-muted-foreground">
              Коды пикселей для рекламных кампаний добавляются в &lt;head&gt;
            </p>
          </div>
          <div>
            <h4 className="font-medium">Онлайн чаты</h4>
            <p className="text-sm text-muted-foreground">
              Виджеты чатов (Jivosite, WhatsApp и др.) обычно размещаются в &lt;/body&gt;
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}