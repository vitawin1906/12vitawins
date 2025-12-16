import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Calendar, User, ArrowRight, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from './ui/skeleton';

import {
    useGetPublishedPostsQuery,
    type BlogPost
} from '@/store/api/domains';

const BlogSection = () => {
    // 🔥 Вместо api.blog.list → RTK Query
    const {
        data: posts,
        isLoading,
        isError,
    } = useGetPublishedPostsQuery();

    if (isLoading) {
        return (
            <section className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Почувствуйте разницу через 30 дней
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Откройте для себя экспертные советы по здоровью и благополучию
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="overflow-hidden">
                                <Skeleton className="aspect-[4/3] w-full" />
                                <CardContent className="p-6">
                                    <Skeleton className="h-4 w-20 mb-3" />
                                    <Skeleton className="h-6 w-full mb-3" />
                                    <Skeleton className="h-4 w-full mb-2" />
                                    <Skeleton className="h-4 w-2/3 mb-4" />
                                    <div className="flex justify-between">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-8 w-20" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (isError || !posts?.length) {
        return (
            <section className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        Почувствуйте разницу через 30 дней
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Статьи появятся совсем скоро
                    </p>

                    <Button
                        size="lg"
                        variant="outline"
                        className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 mt-6"
                        asChild
                    >
                        <Link to="/blog">
                            Перейти в блог
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </section>
        );
    }

    // 🔥 Отображаем только первые 3 (как было в api.blog.list)
    const firstThree = posts.slice(0, 3);

    return (
        <section className="py-16 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        Почувствуйте разницу через 30 дней
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Наши материалы помогут вам начать путь к здоровью
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    {firstThree.map((post: BlogPost) => {
                        const excerpt =
                            post.excerpt ||
                            (post.content?.replace(/<[^>]+>/g, '') || '').substring(0, 120) + '...';

                        const readTime =
                            post.readTime ||
                            Math.max(1, Math.ceil((post.content?.length || 800) / 1000));

                        const url = `/blog/${post.customUrl || post.categorySlug || post.id}`;

                        return (
                            <Card
                                key={post.id}
                                className="group hover:shadow-lg transition-all duration-300 border-none shadow-sm overflow-hidden"
                            >
                                <div className="aspect-[4/3] overflow-hidden bg-gray-200">
                                    {post.heroMediaId ? (
                                        <img
                                            src={`/api/images/${post.heroMediaId}`}
                                            alt={post.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-r from-emerald-100 to-blue-100 flex items-center justify-center">
                                            <div className="text-center p-6">
                                                <h4 className="text-lg font-semibold text-gray-700 mb-2">
                                                    {post.title}
                                                </h4>
                                                <p className="text-sm text-gray-500">Статья о здоровье</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <CardContent className="p-6">

                                    <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                                        <Badge variant="secondary" className="text-xs">
                                            {post.categorySlug || 'Здоровье'}
                                        </Badge>

                                        <div className="flex items-center">
                                            <Eye className="h-3 w-3 mr-1" />
                                            {Math.floor(Math.random() * 1000) + 500}
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-emerald-600 transition-colors">
                                        {post.title}
                                    </h3>

                                    <p className="text-gray-600 mb-4 line-clamp-2">
                                        {excerpt}
                                    </p>

                                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                                        <div className="flex items-center">
                                            <User className="h-4 w-4 mr-1" />
                                            {post.author}
                                        </div>

                                        <div className="flex items-center">
                                            <Calendar className="h-4 w-4 mr-1" />
                                            {new Date(post.publishDate || post.createdAt || '').toLocaleDateString('ru-RU')}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">{readTime} мин чтения</span>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 p-2"
                                            asChild
                                        >
                                            <Link to={url}>
                                                Читать
                                                <ArrowRight className="ml-1 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>

                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <div className="text-center">
                    <Button
                        size="lg"
                        variant="outline"
                        className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                        asChild
                    >
                        <Link to="/blog">
                            Читать все статьи
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>

            </div>
        </section>
    );
};

export default BlogSection;
