
import { Star } from 'lucide-react';

interface ProductReviewsSectionProps {
  rating?: number;
  totalReviews?: number;
  reviewBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  userReviews: Array<{
    userName: string;
    rating: number;
    date: string;
    title: string;
    comment: string;
  }>;
}

const ProductReviewsSection = ({ 
  rating, 
  totalReviews, 
  reviewBreakdown, 
  userReviews = [] 
}: ProductReviewsSectionProps) => {
  return (
    <section className="mb-8 sm:mb-12 bg-white">
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">Отзывы покупателей</h2>
        
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-16">
          {/* Rating Overview - Top on mobile, Left on desktop */}
          <div className="flex-shrink-0 lg:w-64">
            <div className="text-center lg:text-left bg-gray-50 lg:bg-transparent rounded-lg p-4 lg:p-0">
              <div className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2 sm:mb-3">{rating}</div>
              <div className="flex items-center justify-center lg:justify-start mb-2 sm:mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 sm:h-5 sm:w-5 ${i < Math.floor(rating || 4) ? 'text-yellow-400 fill-current' : 'text-gray-200'}`}
                  />
                ))}
              </div>
              <div className="text-sm text-gray-600">{totalReviews} проверенных отзывов</div>
            </div>
          </div>
          
          {/* User Reviews - Bottom on mobile, Right on desktop */}
          <div className="flex-1 space-y-6 sm:space-y-8 lg:space-y-12">
            {(userReviews || []).map((review, index) => (
              <div key={index} className="bg-gray-50 lg:bg-transparent rounded-lg p-4 lg:p-0 space-y-3">
                {/* Review Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 leading-tight">{review.title}</h3>
                  <span className="text-sm text-gray-400 flex-shrink-0">{review.date}</span>
                </div>
                
                {/* Rating Stars */}
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 sm:h-4 sm:w-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`}
                    />
                  ))}
                </div>
                
                {/* Review Comment */}
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{review.comment}</p>
                
                {/* Review Author */}
                <div className="text-xs sm:text-sm text-gray-500">
                  От {review.userName}, <span className="text-blue-600">Подтверждённая покупка</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductReviewsSection;
