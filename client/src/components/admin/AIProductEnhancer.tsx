import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Sparkles, Loader2, Copy, Check, Wand2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { axiosApi } from '@/lib/axiosApi';

interface Product {
  title: string;
  description: string;
  category: string;
  price: string;
  badge?: string;
}

interface EnhancedProduct {
  title: string;
  description: string;
  short_description: string;
  meta_tags: string[];
  seo_keywords: string[];
}

interface SEOContent {
  seo_title: string;
  meta_description: string;
  h1: string;
  h2_headings: string[];
  key_phrases: string[];
}

interface AIProductEnhancerProps {
  product: Product;
  onApplyChanges: (enhanced: Partial<EnhancedProduct>) => void;
}

const AIProductEnhancer = ({ product, onApplyChanges }: AIProductEnhancerProps) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGeneratingSEO, setIsGeneratingSEO] = useState(false);
  const [enhancedProduct, setEnhancedProduct] = useState<EnhancedProduct | null>(null);
  const [seoContent, setSeoContent] = useState<SEOContent | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const enhanceProduct = async () => {
    setIsEnhancing(true);
    try {
      const response = await axiosApi.post('/ai/enhance-product', product);
      setEnhancedProduct(response.data.enhanced);
      
      toast({
        title: "Описание улучшено! ✨",
        description: `ИИ создал новое описание товара с мета-тегами`,
      });
    } catch (error) {
      toast({
        title: "Ошибка ИИ",
        description: "Не удалось улучшить описание. Попробуйте снова.",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const generateSEO = async () => {
    setIsGeneratingSEO(true);
    try {
      const response = await axiosApi.post('/ai/generate-seo', {
        title: product.title,
        category: product.category,
      });
      setSeoContent(response.data.seo);
      
      toast({
        title: "SEO контент создан! 🎯",
        description: "ИИ сгенерировал SEO заголовки и мета-теги",
      });
    } catch (error) {
      toast({
        title: "Ошибка SEO",
        description: "Не удалось создать SEO контент. Попробуйте снова.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSEO(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: "Скопировано!",
        description: "Текст скопирован в буфер обмена",
      });
    } catch (error) {
      toast({
        title: "Ошибка копирования",
        description: "Не удалось скопировать текст",
        variant: "destructive",
      });
    }
  };

  const applyField = (field: keyof EnhancedProduct, value: any) => {
    onApplyChanges({ [field]: value });
    toast({
      title: "Применено!",
      description: `${field === 'title' ? 'Название' : field === 'description' ? 'Описание' : 'Поле'} обновлено`,
    });
  };

  return (
    <div className="space-y-6">
      {/* AI Control Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="w-5 h-5 text-purple-600" />
            ИИ Помощник ChatGPT
          </CardTitle>
          <p className="text-sm text-gray-600">
            Автоматическое улучшение описаний товаров и создание SEO контента
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button
              onClick={enhanceProduct}
              disabled={isEnhancing || !product.title}
              className="flex-1"
              variant="default"
            >
              {isEnhancing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Улучшить описание
            </Button>
            <Button
              onClick={generateSEO}
              disabled={isGeneratingSEO || !product.title}
              variant="outline"
              className="flex-1"
            >
              {isGeneratingSEO ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Создать SEO
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Product Results */}
      {enhancedProduct && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-emerald-600" />
              Улучшенное описание
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enhanced Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Улучшенное название:</label>
              <div className="flex gap-2">
                <Textarea
                  value={enhancedProduct.title}
                  readOnly
                  className="flex-1 min-h-[60px]"
                />
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(enhancedProduct.title, 'title')}
                  >
                    {copiedField === 'title' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => applyField('title', enhancedProduct.title)}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    Применить
                  </Button>
                </div>
              </div>
            </div>

            {/* Enhanced Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Подробное описание:</label>
              <div className="flex gap-2">
                <Textarea
                  value={enhancedProduct.description}
                  readOnly
                  className="flex-1 min-h-[120px]"
                />
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(enhancedProduct.description, 'description')}
                  >
                    {copiedField === 'description' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => applyField('description', enhancedProduct.description)}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    Применить
                  </Button>
                </div>
              </div>
            </div>

            {/* Short Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Краткое описание:</label>
              <div className="flex gap-2">
                <Textarea
                  value={enhancedProduct.short_description}
                  readOnly
                  className="flex-1 min-h-[60px]"
                />
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(enhancedProduct.short_description, 'short_description')}
                  >
                    {copiedField === 'short_description' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => applyField('short_description', enhancedProduct.short_description)}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    Применить
                  </Button>
                </div>
              </div>
            </div>

            {/* Meta Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Мета-теги:</label>
              <div className="flex flex-wrap gap-2">
                {enhancedProduct.meta_tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="cursor-pointer"
                    onClick={() => copyToClipboard(tag, `meta_tag_${index}`)}>
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* SEO Keywords */}
            <div className="space-y-2">
              <label className="text-sm font-medium">SEO ключевые слова:</label>
              <div className="flex flex-wrap gap-2">
                {enhancedProduct.seo_keywords.map((keyword, index) => (
                  <Badge key={index} variant="outline" className="cursor-pointer"
                    onClick={() => copyToClipboard(keyword, `keyword_${index}`)}>
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEO Content Results */}
      {seoContent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              SEO Контент
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* SEO Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">SEO Заголовок (Title):</label>
              <div className="flex gap-2">
                <Textarea
                  value={seoContent.seo_title}
                  readOnly
                  className="flex-1 min-h-[60px]"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(seoContent.seo_title, 'seo_title')}
                >
                  {copiedField === 'seo_title' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Meta Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">META Description:</label>
              <div className="flex gap-2">
                <Textarea
                  value={seoContent.meta_description}
                  readOnly
                  className="flex-1 min-h-[80px]"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(seoContent.meta_description, 'meta_description')}
                >
                  {copiedField === 'meta_description' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* H1 and H2 Headings */}
            <div className="space-y-2">
              <label className="text-sm font-medium">H1 Заголовок:</label>
              <p className="p-3 bg-gray-50 rounded-lg text-sm">{seoContent.h1}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">H2 Подзаголовки:</label>
              <div className="space-y-1">
                {seoContent.h2_headings.map((heading, index) => (
                  <p key={index} className="p-2 bg-gray-50 rounded text-sm">
                    {index + 1}. {heading}
                  </p>
                ))}
              </div>
            </div>

            {/* Key Phrases */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ключевые фразы:</label>
              <div className="flex flex-wrap gap-2">
                {seoContent.key_phrases.map((phrase, index) => (
                  <Badge key={index} variant="secondary" className="cursor-pointer"
                    onClick={() => copyToClipboard(phrase, `phrase_${index}`)}>
                    {phrase}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIProductEnhancer;