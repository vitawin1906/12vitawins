import { useState } from 'react';
import { useGetPublishedPostsQuery } from '@/store/api/domains';
import type { BlogPost } from '@/store/api/domains';
import SEOHead from '../components/SEOHead';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, User, Search, Eye, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Cart from '../components/Cart';

const categories = ['Все', 'Витамины', 'Питание', 'Спорт', 'Здоровье', 'Исследования'];

const Blog = () => {
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Все');

    // Хук RTK Query
    const { data: posts = [], isLoading, isError } = useGetPublishedPostsQuery();

    // Фильтр статей
    const filteredPosts = posts.filter((post: BlogPost) => {
        const fullContent = post.content ?? '';
        const excerpt = post.excerpt ?? fullContent.substring(0, 140);

        const matches =
            post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            excerpt.toLowerCase().includes(searchQuery.toLowerCase());

        return matches;
    });

    return (
        <div className="min-h-screen bg-gray-50" itemScope itemType="https://schema.org/Blog">
            <SEOHead
                title="Блог о здоровье — VitaWin | Экспертные статьи"
                description="Экспертные статьи о здоровье, питании и БАД от специалистов VitaWin."
                keywords="блог о здоровье, статьи витамины, БАД советы, научные исследования"
                ogTitle="Блог о здоровье VitaWin"
                ogDescription="Читайте экспертные статьи о здоровье и витаминах."
                ogUrl={`${window.location.origin}/blog`}
                ogImage={`${window.location.origin}/vitawin-logo.png`}
            />

            <Header onCartClick={() => setIsCartOpen(true)} />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Title */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        Блог о здоровье
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Экспертные статьи о витаминах, питании и здоровье
                    </p>
                </div>

                {/* Search */}
                <div className="mb-8 space-y-4">
                    <div className="relative max-w-md mx-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Поиск статей..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Category buttons (пока не работает) */}
                    <div className="flex flex-wrap justify-center gap-2">
                        {categories.map((category) => (
                            <Button
                                key={category}
                                variant={selectedCategory === category ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedCategory(category)}
                            >
                                {category}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3].map((i) => (
                            <Card key={i}>
                                <Skeleton className="aspect-video" />
                                <CardHeader>
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-6 w-full" />
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Error */}
                {isError && (
                    <div className="text-center py-12">
                        <p className="text-red-500">Ошибка загрузки статей</p>
                    </div>
                )}

                {/* Posts */}
                {!isLoading && !isError && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredPosts.map((post) => {
                                const preview = post.excerpt ?? (post.content ?? '').substring(0, 150);
                                const date = post.publishDate ?? post.createdAt ?? new Date().toISOString();

                                const imageSrc = post.heroMediaId
                                    ? `/api/images/${post.heroMediaId}`
                                    : null;

                                const url = `/blog/${post.customUrl || post.id}`;

                                return (
                                    <Card key={post.id} className="overflow-hidden group shadow-sm hover:shadow-lg transition-all">
                                        {/* Image */}
                                        <div className="aspect-[4/3] bg-gray-200 overflow-hidden">
                                            {imageSrc ? (
                                                <img
                                                    src={imageSrc}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition"
                                                    alt={post.title}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center w-full h-full text-gray-500 bg-gray-100">
                                                    <span>Нет изображения</span>
                                                </div>
                                            )}
                                        </div>

                                        <CardContent className="p-6">
                                            <div className="flex justify-between text-sm text-gray-500 mb-3">
                                                <Badge variant="secondary">Здоровье</Badge>
                                                <div className="flex items-center">
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    {Math.floor(Math.random() * 900) + 300}
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-emerald-600">
                                                {post.title}
                                            </h3>

                                            <p className="text-gray-600 line-clamp-2 mb-4">{preview}</p>

                                            <div className="flex justify-between text-sm text-gray-500 mb-4">
                                                <div className="flex items-center">
                                                    <User className="h-4 w-4 mr-1" />
                                                    {post.author || "Автор"}
                                                </div>
                                                <div className="flex items-center">
                                                    <Calendar className="h-4 w-4 mr-1" />
                                                    {new Date(date).toLocaleDateString('ru-RU')}
                                                </div>
                                            </div>

                                            <Button variant="ghost" size="sm" asChild>
                                                <Link to={url}>
                                                    Читать
                                                    <ArrowRight className="ml-1 h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* "No results" */}
                        {filteredPosts.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                Статей по вашему запросу не найдено
                            </div>
                        )}
                    </>
                )}
            </div>

            <Footer />
            <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </div>
    );
};

export default Blog;
