
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const BlogQualityCommitment = () => {
  return (
    <div className="my-8 bg-gray-50 rounded-2xl overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="p-6 md:p-8">
          <h3 className="text-xl font-semibold mb-4">Высочайшие стандарты качества</h3>
          <p className="text-gray-700 mb-4">
            В VitaWin мы стремимся предоставлять биологически активные добавки высочайшего качества. 
            Наши продукты производятся на сертифицированных FDA предприятиях, которые следуют строгим 
            принципам надлежащей производственной практики (GMP).
          </p>
          <p className="text-gray-700 mb-4">
            Каждая партия наших добавок проходит строгое тестирование на чистоту, активность и качество. 
            Мы получаем ингредиенты от надежных поставщиков, которые разделяют нашу приверженность качеству и устойчивости.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            <Badge className="bg-gray-700 hover:bg-gray-800">Сертифицированно GMP</Badge>
            <Badge className="bg-gray-700 hover:bg-gray-800">Зарегистрировано FDA</Badge>
            <Badge className="bg-gray-700 hover:bg-gray-800">Тестировано третьей стороной</Badge>
            <Badge className="bg-gray-700 hover:bg-gray-800">Экологично</Badge>
          </div>
        </div>
        <div className="bg-emerald-600 p-6 md:p-8 flex items-center">
          <div className="text-white">
            <h3 className="text-xl font-semibold mb-4">Наше обещание</h3>
            <p className="mb-4">
              Мы поддерживаем наши продукты 100% гарантией удовлетворенности. Если вы не полностью 
              удовлетворены своей покупкой, мы вернем ваши деньги или заменим продукт.
            </p>
            <div className="mt-6">
              <Button variant="outline" className="text-white border-white hover:bg-white hover:text-emerald-600">
                Узнать больше о компании
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogQualityCommitment;
