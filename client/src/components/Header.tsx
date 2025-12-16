import { useState } from 'react';
import { Menu, ShoppingCart, Search, User, LogOut } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Link } from 'react-router-dom';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { TelegramAuthButton } from "@/components/TelegramAuthButton";
import {useAuthStore} from "@/stores";
import {useLogoutMutation} from "@/store/api/domains";
import { useGetCartPreviewQuery } from '@/store/api/domains/cartApi';

interface HeaderProps {
    onCartClick: () => void;
}

const Header = ({ onCartClick }: HeaderProps) => {
    const { t } = useLanguage();
    const { user, clearUser, isHydrated } = useAuthStore();

    // ✅ Получаем количество товаров из API, а не локального store
    const { data: cartPreview } = useGetCartPreviewQuery(undefined, {
        skip: !isHydrated || !user,
        refetchOnMountOrArgChange: true,
    });
    const cartItemsCount = cartPreview?.items?.length ?? 0;

    const [searchQuery, setSearchQuery] = useState('');
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [logout] = useLogoutMutation();


    const handleLogout = async () => {
        try {
            await logout().unwrap(); // 1️⃣ logout на сервере
        } catch (e) {
            console.warn("Logout request failed", e);
        }

        clearUser(); // 2️⃣ logout в Zustand
    };

    const handleTelegramLogin = () => {
        // открываем безопасно в новом окне
        window.open('/auth/telegram', '_blank', 'noopener,noreferrer');
    };

    // единый dropdown для desktop + mobile
    const AuthMenu = () => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="flex hover:bg-emerald-50 transition-colors"
                >
                    <User className="h-7 w-7 text-gray-700 hover:text-emerald-600 transition-transform duration-150 hover:scale-110" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-56 rounded-xl shadow-lg border border-gray-100 bg-white"
            >
                {!user ? (
                    <>
                        <DropdownMenuItem asChild>
                            <Link
                                to="/login"
                                className="flex items-center gap-2 px-2 py-2 text-gray-700 hover:bg-emerald-50 rounded-md transition-colors"
                            >
                                🔑 Войти
                            </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                            <Link
                                to="/registry"
                                className="flex items-center gap-2 px-2 py-2 text-gray-700 hover:bg-emerald-50 rounded-md transition-colors"
                            >
                                📝 Зарегистрироваться
                            </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            onClick={handleTelegramLogin}
                            className="flex items-center gap-2 px-2 py-2 text-gray-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                        >
                            <img
                                src="/telegram-icon.svg"
                                alt="Telegram"
                                className="w-5 h-5 mr-1"
                            />
                            Войти через Telegram
                        </DropdownMenuItem>
                    </>
                ) : (
                    <>
                        <DropdownMenuItem asChild>
                            <Link
                                to="/account"
                                className="flex items-center gap-2 px-2 py-2 text-gray-700 hover:bg-emerald-50 rounded-md transition-colors"
                            >
                                👤 Профиль
                            </Link>
                        </DropdownMenuItem>

                        {user?.isAdmin && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link
                                        to="/admin"
                                        className="flex items-center gap-2 px-2 py-2 text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                                    >
                                        ⚙️ Админ-панель
                                    </Link>
                                </DropdownMenuItem>
                            </>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-2 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" />
                            Выйти
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2">
                        <img
                            src="/vitawin-logo.png"
                            alt="VitaWin"
                            className="h-8 sm:h-10 md:h-12 w-auto"
                            width="120"
                            height="48"
                            loading="eager"
                            decoding="async"
                        />
                    </Link>

                    {/* Search Bar - Desktop */}
                    <div className="hidden md:flex flex-1 max-w-lg mx-8">
                        <div className="relative w-full">
                            <Input
                                type="text"
                                placeholder="Поиск товаров..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-8">
                        <Link to="/" className="text-gray-600 hover:text-emerald-600 font-medium">
                            Главная
                        </Link>
                        <Link to="/store" className="text-gray-600 hover:text-emerald-600 font-medium">
                            Товары
                        </Link>
                        <Link to="/blog" className="text-gray-600 hover:text-emerald-600 font-medium">
                            Блог
                        </Link>
                        <Link to="/about" className="text-gray-600 hover:text-emerald-600 font-medium">
                            О нас
                        </Link>
                        <Link to="/contact" className="text-gray-600 hover:text-emerald-600 font-medium">
                            Контакты
                        </Link>
                    </nav>

                    {/* Right Side */}
                    <div className="flex items-center space-x-4">
                        {/* Language Switcher */}
                        <div className="hidden md:block">
                            <LanguageSwitcher />
                        </div>

                        {/* Auth Menu (works both desktop & mobile) */}
                        <AuthMenu />

                        {/* Cart */}
                        <div className="relative">
                            <button
                                onClick={onCartClick}
                                className="text-gray-600 hover:text-emerald-600 transition-colors"
                            >
                                <ShoppingCart className="h-6 w-6" />
                            </button>
                            {cartItemsCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full text-xs px-1.5 font-medium">
                  {cartItemsCount}
                </span>
                            )}
                        </div>

                        {/* Mobile Menu */}
                        <div className="md:hidden">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Menu className="h-6 w-6" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="p-0 pt-6 w-72">
                                    {/* Search */}
                                    <div className="px-4 pb-4">
                                        <div className="relative">
                                            <Input
                                                type="text"
                                                placeholder="Поиск товаров..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2"
                                            />
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>

                                    {/* Nav + AuthMenu */}
                                    <nav className="px-4 py-4 space-y-2">
                                        {['Главная', 'Товары', 'Блог', 'О нас', 'Контакты'].map(
                                            (item, i) => {
                                                const links = [
                                                    '/',
                                                    '/store',
                                                    '/blog',
                                                    '/about',
                                                    '/contact',
                                                ];
                                                return (
                                                    <Link
                                                        key={i}
                                                        to={links[i]}
                                                        className="block py-3 text-gray-600 hover:text-emerald-600 font-medium"
                                                    >
                                                        {item}
                                                    </Link>
                                                );
                                            }
                                        )}
                                        <div className="pt-4 border-t border-gray-200">
                                            <AuthMenu />
                                        </div>
                                    </nav>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>
            </div>
            <TelegramAuthButton
                variant="modal"
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
            />
        </header>
    );
};

export default Header;


