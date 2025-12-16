
interface BlogArticleContentProps {
  content: string;
  videoUrl?: string;
  galleryImages?: string[];
}

const BlogArticleContent = ({ content, videoUrl, galleryImages }: BlogArticleContentProps) => {
  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : url;
  };

  return (
    <div className="prose prose-lg max-w-none mb-8 px-4 sm:px-0">
      <div className="max-w-4xl mx-auto">
        {videoUrl && (
          <div className="mb-8">
            <div className="aspect-video">
              <iframe
                src={getYouTubeEmbedUrl(videoUrl)}
                title="Video content"
                className="w-full h-full rounded-lg"
                frameBorder="0"
                allowFullScreen
              />
            </div>
          </div>
        )}
        
        <div dangerouslySetInnerHTML={{ __html: content }} />
        
        {galleryImages && galleryImages.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Галерея</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {galleryImages.map((imageUrl, index) => (
                <div key={index} className="aspect-square overflow-hidden rounded-lg">
                  <img
                    src={imageUrl}
                    alt={`Gallery image ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => window.open(imageUrl, '_blank')}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogArticleContent;
