
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Eye, ArrowLeft, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BlogArticleHeaderProps {
  title: string;
  category: string;
  author: string;
  publishDate: string;
  views: number;
  readTime: number;
  imageUrl: string;
}

const BlogArticleHeader = ({
  title,
  category,
  author,
  publishDate,
  views,
  readTime,
  imageUrl
}: BlogArticleHeaderProps) => {
  return (
    <>
      <div className="max-w-4xl mx-auto mb-6 px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/blog" className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Вернуться к блогу
          </Link>
        </Button>
      </div>

      <div className="bg-white">
        <div className="aspect-video bg-gray-200 overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="px-4 sm:px-6 lg:px-12 py-8 md:py-12">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <Badge>{category}</Badge>
              <Button variant="ghost" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Поделиться
              </Button>
            </div>
            
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-6">
              {title}
            </h1>
            
            <div className="flex flex-wrap items-center text-sm text-gray-500 mb-8 space-x-4">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                {author}
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date(publishDate).toLocaleDateString('ru-RU')}
              </div>
              <div className="flex items-center">
                <Eye className="h-4 w-4 mr-1" />
                {views}
              </div>
              <span>{readTime} мин чтения</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogArticleHeader;
