
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface BlogArticleFooterProps {
  author: string;
}

const BlogArticleFooter = ({ author }: BlogArticleFooterProps) => {
  return (
    <div className="max-w-4xl mx-auto border-t pt-8 mt-8 px-4 sm:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h3 className="font-semibold">Автор статьи</h3>
          <p className="text-gray-600">{author}</p>
        </div>
        <Button asChild>
          <Link to="/contact">Связаться с автором</Link>
        </Button>
      </div>
    </div>
  );
};

export default BlogArticleFooter;
