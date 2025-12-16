import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Cart from '../components/Cart';
import BlogProductRecommendation from '../components/blog/BlogProductRecommendation';
import BlogQualityCommitment from '../components/blog/BlogQualityCommitment';
import BlogAffiliatePromo from '../components/blog/BlogAffiliatePromo';
import BlogArticleHeader from '../components/blog/BlogArticleHeader';
import BlogArticleContent from '../components/blog/BlogArticleContent';
import BlogArticleFooter from '../components/blog/BlogArticleFooter';
import { Skeleton } from '../components/ui/skeleton';
import { useGetPostByUrlOrIdQuery } from "@/store/api/domains";

const BlogArticle = () => {
    const [isCartOpen, setIsCartOpen] = useState(false);
    const { id } = useParams<{ id: string }>();

    const { data: article, isLoading, isError } = useGetPostByUrlOrIdQuery(id!, {
        skip: !id
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header onCartClick={() => setIsCartOpen(true)} />
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Skeleton className="h-8 w-3/4 mb-4" />
                    <Skeleton className="h-64 w-full mb-8" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3 mb-8" />
                </div>
                <Footer />
            </div>
        );
    }

    if (isError || !article) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header onCartClick={() => setIsCartOpen(true)} />
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Статья не найдена</h1>
                    <p className="text-gray-600">Возможно, статья была удалена или URL неверный</p>
                </div>
                <Footer />
            </div>
        );
    }

    const readTime = Math.ceil((article.content?.length || 0) / 1000);

    return (
        <div className="min-h-screen bg-gray-50" itemScope itemType="https://schema.org/Article">
            <Header onCartClick={() => setIsCartOpen(true)} />

            <div className="w-full">
                <div className="py-8">
                    <BlogArticleHeader
                        title={article.title}
                        category={article.categorySlug || "Здоровье"}
                        author={article.author || "Автор"}
                        publishDate={article.createdAt ?? ""}
                        views={0}
                        readTime={readTime}
                        imageUrl={article.heroMediaId ? `/api/images/${article.heroMediaId}` : "/vitawin-logo.png"}
                    />

                    <BlogArticleContent
                        content={article.content || ""}
                        videoUrl=""
                        galleryImages={article.images?.map(img => `/api/images/${img.mediaId}`) ?? []}
                    />

                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <BlogProductRecommendation
                            category={article.categorySlug || "Здоровье"}
                            title="Рекомендуемые витамины"
                            maxProducts={4}
                        />
                    </div>

                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <BlogQualityCommitment />
                    </div>

                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <BlogAffiliatePromo />
                    </div>

                    <div className="px-4 sm:px-6 lg:px-12">
                        <BlogArticleFooter author={article.author || "Автор"} />
                    </div>
                </div>
            </div>

            <Footer />
            <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </div>
    );
};

export default BlogArticle;
