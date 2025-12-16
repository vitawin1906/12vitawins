import { useState } from 'react';

interface ProductGalleryProps {
  images?: string[];
  productName: string;
}

const ProductGallery = ({ images = [], productName }: ProductGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState(0);
  
  // Функция для получения полного URL изображения
  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith('http')) {
      return imagePath; // Уже полный URL
    }
    // Переводим через API endpoint для изображений из базы данных
    if (imagePath.startsWith('/uploads/')) {
      return `/api${imagePath}`;
    }
    return imagePath; // Другие относительные пути
  };

  return (
    <div className="space-y-3 lg:space-y-4">
      {/* Main Image with responsive aspect ratio */}
      <div className="bg-gray-50 rounded-xl overflow-hidden">
        <div className="aspect-square lg:aspect-[740/1110]">
          <img
            src={images.length > 0 ? getImageUrl(images[selectedImage]) : '/placeholder.svg'}
            alt={productName}
            className="w-full h-full object-contain"
          />
        </div>
      </div>
      
      {/* Thumbnail Gallery - responsive grid */}
      <div className="grid grid-cols-4 gap-2 lg:gap-3">
        {images.slice(0, 4).map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedImage(index)}
            className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
              selectedImage === index 
                ? 'border-emerald-500' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <img
              src={getImageUrl(image)}
              alt={`${productName} ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProductGallery;