import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  noindex?: boolean;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
  ogImage,
  ogUrl,
  twitterTitle,
  twitterDescription,
  noindex = false
}) => {
  useEffect(() => {
    // Check if this is a Replit technical domain and add noindex
    const hostname = window.location.hostname;
    const isReplitDomain = hostname.includes('replit.dev') || hostname.includes('replit.app') || hostname.includes('picard.replit.dev');
    
    // Handle robots meta tag
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }
    
    if (noindex || isReplitDomain) {
      // Add noindex for admin pages or Replit domains
      robotsMeta.setAttribute('content', 'noindex, nofollow, noarchive, nosnippet');
    } else {
      // Allow indexing for regular pages on production domain
      robotsMeta.setAttribute('content', 'index, follow');
    }

    // Update page title
    document.title = title;

    // Update meta description
    if (description) {
      let descMeta = document.querySelector('meta[name="description"]');
      if (!descMeta) {
        descMeta = document.createElement('meta');
        descMeta.setAttribute('name', 'description');
        document.head.appendChild(descMeta);
      }
      descMeta.setAttribute('content', description);
    }

    // Update meta keywords
    if (keywords) {
      let keywordsMeta = document.querySelector('meta[name="keywords"]');
      if (!keywordsMeta) {
        keywordsMeta = document.createElement('meta');
        keywordsMeta.setAttribute('name', 'keywords');
        document.head.appendChild(keywordsMeta);
      }
      keywordsMeta.setAttribute('content', keywords);
    }

    // Update Open Graph title
    if (ogTitle) {
      let ogTitleMeta = document.querySelector('meta[property="og:title"]');
      if (!ogTitleMeta) {
        ogTitleMeta = document.createElement('meta');
        ogTitleMeta.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitleMeta);
      }
      ogTitleMeta.setAttribute('content', ogTitle);
    }

    // Update Open Graph description
    if (ogDescription) {
      let ogDescMeta = document.querySelector('meta[property="og:description"]');
      if (!ogDescMeta) {
        ogDescMeta = document.createElement('meta');
        ogDescMeta.setAttribute('property', 'og:description');
        document.head.appendChild(ogDescMeta);
      }
      ogDescMeta.setAttribute('content', ogDescription);
    }

    // Update Open Graph image
    if (ogImage) {
      let ogImageMeta = document.querySelector('meta[property="og:image"]');
      if (!ogImageMeta) {
        ogImageMeta = document.createElement('meta');
        ogImageMeta.setAttribute('property', 'og:image');
        document.head.appendChild(ogImageMeta);
      }
      ogImageMeta.setAttribute('content', ogImage);
    }

    // Update Open Graph URL
    if (ogUrl) {
      let ogUrlMeta = document.querySelector('meta[property="og:url"]');
      if (!ogUrlMeta) {
        ogUrlMeta = document.createElement('meta');
        ogUrlMeta.setAttribute('property', 'og:url');
        document.head.appendChild(ogUrlMeta);
      }
      ogUrlMeta.setAttribute('content', ogUrl);
    }

    // Update Twitter Card title
    if (twitterTitle) {
      let twitterTitleMeta = document.querySelector('meta[name="twitter:title"]');
      if (!twitterTitleMeta) {
        twitterTitleMeta = document.createElement('meta');
        twitterTitleMeta.setAttribute('name', 'twitter:title');
        document.head.appendChild(twitterTitleMeta);
      }
      twitterTitleMeta.setAttribute('content', twitterTitle);
    }

    // Update Twitter Card description
    if (twitterDescription) {
      let twitterDescMeta = document.querySelector('meta[name="twitter:description"]');
      if (!twitterDescMeta) {
        twitterDescMeta = document.createElement('meta');
        twitterDescMeta.setAttribute('name', 'twitter:description');
        document.head.appendChild(twitterDescMeta);
      }
      twitterDescMeta.setAttribute('content', twitterDescription);
    }

    // Update Twitter Card image
    if (ogImage) {
      let twitterImageMeta = document.querySelector('meta[name="twitter:image"]');
      if (!twitterImageMeta) {
        twitterImageMeta = document.createElement('meta');
        twitterImageMeta.setAttribute('name', 'twitter:image');
        document.head.appendChild(twitterImageMeta);
      }
      twitterImageMeta.setAttribute('content', ogImage);
    }
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, ogUrl, twitterTitle, twitterDescription]);

  return null;
};

export default SEOHead;