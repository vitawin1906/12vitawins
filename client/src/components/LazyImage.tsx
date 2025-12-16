import { useState, useRef, useEffect } from 'react';
import { getProductImageUrl } from '@/utils/imageUtils';

interface LazyImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: string;
  loading?: 'lazy' | 'eager';
  width?: number;
  height?: number;
  aspectRatio?: string;
}

export const LazyImage = ({ 
  src, 
  alt, 
  className = '', 
  fallback = '/placeholder.svg',
  loading = 'lazy',
  width,
  height,
  aspectRatio = '1/1'
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(loading === 'eager');
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (loading === 'eager') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [loading]);

  const imageUrl = getProductImageUrl(src);
  const displayUrl = hasError ? fallback : imageUrl;

  const containerStyles = {
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
    aspectRatio: !width && !height ? aspectRatio : undefined
  };

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={containerStyles}
    >
      {!isInView && (
        <div 
          ref={imgRef}
          className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center"
        >
          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      
      {isInView && (
        <img
          ref={imgRef}
          src={displayUrl}
          alt={alt}
          className={`w-full h-full object-contain p-4 transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            setIsLoaded(true);
          }}
          loading={loading}
          width={width || 300}
          height={height || 300}
          decoding="async"
          style={{ 
            minWidth: width ? `${width}px` : '200px', 
            minHeight: height ? `${height}px` : '200px' 
          }}
        />
      )}
      
      {isInView && !isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};