import { Shield, Leaf, Heart, Award, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import CompanyCommitmentsEditor from "@/components/admin/CompanyCommitmentsEditor";
import { useGetCompanyCommitmentsQuery } from "@/store/api/domains";

const CompanyCommitments = () => {
  const [isEditing, setIsEditing] = useState(false);

  // Загрузка данных из API
  const { data: commitmentsArray = [] } = useGetCompanyCommitmentsQuery();
  const commitments = commitmentsArray[0]; // Берем первый элемент массива

  // Используем данные из API или значения по умолчанию
  const title = commitments?.title || "Наши обязательства по качеству";
  const subtitle = commitments?.subtitle || "Высочайшие стандарты";
  const description1 = commitments?.description1 || "В VitaWin мы стремимся предоставлять витамины и минералы, БАДы и пищевые добавки высочайшего качества. Наша продукция производится на собственном предприятии в Санкт-Петербурге, зарегистрировано в ЕАС, которые следуют строгим рекомендациям надлежащей производственной практики (GMP).";
  const description2 = commitments?.description2 || "Каждая партия наших добавок проходит строгое тестирование на чистоту, эффективность и качество. Мы сами выращиваем и закупаем ингредиенты у проверенных поставщиков, которые разделяют наши обязательства по качеству и устойчивости.";
  const promiseTitle = commitments?.promise_title || "Наше обещание";
  const promiseText = commitments?.promise_text || "Мы поддерживаем нашу продукцию 100% гарантией удовлетворения. Если вы не полностью удовлетворены покупкой, мы вернем деньги или заменим товар.";
  const guaranteeButtonText = commitments?.guarantee_button_text || "Получить гарантию качества";
  const guaranteeButtonUrl = commitments?.guarantee_button_url || "#";

  // Проверяем, разрешено ли редактирование (режим разработки или админ)
  const isEditingAllowed = import.meta.env.DEV || window.location.search.includes('admin=true');

  return (
    <div className="bg-gray-50 py-12 relative">
      {/* Кнопка редактирования - только для разработки или админов */}
      {isEditingAllowed && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white"
        >
          <Edit className="w-4 h-4" />
        </Button>
      )}

      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">{title}</h2>
        
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Левая колонка - Высочайшие стандарты */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6">{subtitle}</h3>
            
            <p className="text-gray-700 leading-relaxed mb-6">
              {description1}
            </p>
            
            <p className="text-gray-700 leading-relaxed mb-6">
              {description2}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm text-center">Сертифицировано ЕАС</div>
              <div className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm text-center">Зарегистрировано СГР</div>
              <div className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm text-center">Протестировано лабораторией</div>
              <div className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm text-center">
                Экологически чистые источники
              </div>
            </div>
          </div>

          {/* Правая колонка - Наше обещание */}
          <div className="bg-emerald-600 text-white p-8 rounded-lg">
            <h3 className="text-xl font-semibold mb-6">{promiseTitle}</h3>
            
            <p className="mb-6 leading-relaxed">
              {promiseText}
            </p>

            <div className="bg-white/20 p-4 rounded-lg mb-6">
              <input 
                type="email" 
                placeholder="Введите ваш email"
                className="w-full px-4 py-2 rounded-lg text-gray-900 placeholder-gray-500"
              />
            </div>

            <Button 
              className="w-full bg-white text-emerald-600 hover:bg-gray-100"
              onClick={() => {
                if (guaranteeButtonUrl && guaranteeButtonUrl !== 'https://t.me/Vitawin_bot?start=auth') {
                  window.open(guaranteeButtonUrl, '_blank');
                }
              }}
            >
              {guaranteeButtonText}
            </Button>
          </div>
        </div>

        {/* Дополнительные обязательства */}
        <div className="mt-12 grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Leaf className="w-8 h-8 text-emerald-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Zero Waste</h4>
            <p className="text-sm text-gray-600">Экологически ответственное производство без отходов</p>
          </div>

          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Благотворительность</h4>
            <p className="text-sm text-gray-600">Поддерживаем благотворительные программы в России</p>
          </div>

          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="w-8 h-8 text-purple-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Научный подход</h4>
            <p className="text-sm text-gray-600">Исследования на основе научных данных и ИИ-исследований</p>
          </div>

          <div className="text-center">
            <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-orange-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Гарантия</h4>
            <p className="text-sm text-gray-600">100% гарантия возврата средств в течение 15 дней</p>
          </div>
        </div>
      </div>

      {/* Модальное окно редактирования */}
      {isEditing && (
        <CompanyCommitmentsEditor onClose={() => setIsEditing(false)} />
      )}
    </div>
  );
};

export default CompanyCommitments;