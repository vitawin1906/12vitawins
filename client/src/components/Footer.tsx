import { Heart, Mail, Phone, MapPin, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useContactStore } from '@/store/contactStore';
const Footer = () => {
  const {
    contactInfo
  } = useContactStore();
  return <footer className="bg-gray-50 text-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Company Info */}
          <div className="space-y-4">
            <img src="/vitawin-logo.png" alt="VitaWin" className="h-14 w-auto" />
            <p className="text-gray-600 leading-relaxed">ООО "Хёрбалсон" 
2100016720 1242100003760 </p>
            
            {/* Social Media */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-800">Мы в социальных сетях</h4>
              <div className="flex space-x-3">
                <a href="https://instagram.com/vitawin.official" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform" aria-label="Instagram">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="https://t.me/vitawin_ru" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform" aria-label="Telegram">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </a>
                <a href="https://vk.com/vitawin.official" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform" aria-label="VKontakte">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.525-2.049-1.714-1.033-1.01-1.49-.787-1.49.525v1.607c0 .393-.128.525-.524.525-1.332 0-2.8-.525-3.956-1.871-2.288-2.656-2.956-4.662-2.956-5.055 0-.393.157-.525.59-.525h1.744c.39 0 .524.262.655.656.918 2.361 2.361 4.001 2.952 3.279.459-.525.262-3.41-.328-4.001-.525-.525-.131-.787.393-.787h2.623c.393 0 .459.262.459.656v3.541c0 .393.197.787.656.262 1.115-1.246 1.902-3.148 1.902-3.41 0-.262.196-.525.59-.525h1.743c.786 0 .393 1.18-.262 2.361-.787 1.377-1.771 2.623-1.771 2.951 0 .394.787.787 1.378 1.511.787.918 1.378 1.771 1.378 2.295 0 .393-.262.656-.918.656z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Быстрые ссылки</h4>
            <ul className="space-y-2">
              <li><Link to="/store" className="text-gray-600 hover:text-primary transition-colors">Все товары</Link></li>
              <li><Link to="/blog" className="text-gray-600 hover:text-primary transition-colors">Блог о здоровье</Link></li>
              <li><Link to="/about" className="text-gray-600 hover:text-primary transition-colors">О нас</Link></li>
              <li><Link to="/contact" className="text-gray-600 hover:text-primary transition-colors">Контакты</Link></li>
            </ul>
          </div>

          {/* Affiliate Program */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Партнёрская программа</h4>
            <ul className="space-y-2">
              <li><Link to="/affiliate" className="text-gray-600 hover:text-primary transition-colors">Подробно про систему</Link></li>

              <li><a href="https://t.me/vitawin_support_bot" className="text-gray-600 hover:text-primary transition-colors">Поддержка</a></li>
            </ul>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Контакты</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-gray-600 text-sm">{contactInfo.phone}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-gray-600 text-sm">{contactInfo.email}</span>
              </div>
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                
              </div>
              <div className="pt-2">
                
                
                
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              © 2023-2025 VitaWin. Все права защищены. | Создано с{' '}
              <Heart className="inline h-4 w-4 text-primary" /> для вашего здоровья.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/privacy-policy" className="text-gray-500 hover:text-primary text-sm transition-colors">Политика конфиденциальности</Link>
              <Link to="/terms-of-service" className="text-gray-500 hover:text-primary text-sm transition-colors">Условия использования</Link>
              <Link to="/contract-offer" className="text-gray-500 hover:text-primary text-sm transition-colors">Договор оферта</Link>
              <Link to="/cookie-policy" className="text-gray-500 hover:text-primary text-sm transition-colors">Политика cookies</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>;
};
export default Footer;