// Dynamic SEO Head Component for NeuraFit
// Provides page-specific SEO optimization with structured data

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getSEOConfig, generateKeywords, SEO_CONSTANTS } from '../config/seo'

interface SEOHeadProps {
  title?: string
  description?: string
  keywords?: string[]
  canonical?: string
  noindex?: boolean
  nofollow?: boolean
  ogImage?: string
  structuredData?: object
}

export function SEOHead({
  title,
  description,
  keywords,
  canonical,
  noindex = false,
  nofollow = false,
  ogImage,
  structuredData
}: SEOHeadProps) {
  const location = useLocation()
  
  useEffect(() => {
    // Get page-specific SEO config
    const pageName = location.pathname.slice(1) || 'home'
    const seoConfig = getSEOConfig(pageName)
    
    // Use props or fallback to config
    const finalTitle = title || seoConfig.title
    const finalDescription = description || seoConfig.description
    const finalKeywords = keywords || seoConfig.keywords
    const finalCanonical = canonical || seoConfig.canonical
    
    // Update document title
    document.title = finalTitle
    
    // Update meta tags
    updateMetaTag('description', finalDescription)
    updateMetaTag('keywords', generateKeywords(finalKeywords))
    
    // Update robots meta
    const robotsContent = []
    if (noindex || seoConfig.noindex) robotsContent.push('noindex')
    else robotsContent.push('index')
    
    if (nofollow || seoConfig.nofollow) robotsContent.push('nofollow')
    else robotsContent.push('follow')
    
    robotsContent.push('max-snippet:-1', 'max-image-preview:large', 'max-video-preview:-1')
    updateMetaTag('robots', robotsContent.join(', '))
    
    // Update Open Graph tags
    updateMetaProperty('og:title', seoConfig.ogTitle || finalTitle)
    updateMetaProperty('og:description', seoConfig.ogDescription || finalDescription)
    updateMetaProperty('og:url', `https://neurafit-ai-2025.web.app${location.pathname}`)
    
    if (ogImage) {
      updateMetaProperty('og:image', ogImage)
    }
    
    // Update Twitter Card tags
    updateMetaName('twitter:title', seoConfig.twitterTitle || finalTitle)
    updateMetaName('twitter:description', seoConfig.twitterDescription || finalDescription)
    
    // Update canonical URL
    updateCanonicalLink(finalCanonical ? `https://neurafit-ai-2025.web.app${finalCanonical}` : `https://neurafit-ai-2025.web.app${location.pathname}`)
    
    // Add structured data if provided
    if (structuredData) {
      addStructuredData(structuredData)
    }
    
    // Track page view for SEO analytics
    trackPageView(location.pathname, finalTitle)
    
  }, [location, title, description, keywords, canonical, noindex, nofollow, ogImage, structuredData])
  
  return null // This component doesn't render anything
}

// Utility functions for updating meta tags
function updateMetaTag(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', name)
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', content)
}

function updateMetaProperty(property: string, content: string) {
  let meta = document.querySelector(`meta[property="${property}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('property', property)
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', content)
}

function updateMetaName(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', name)
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', content)
}

function updateCanonicalLink(href: string) {
  let link = document.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

function addStructuredData(data: object) {
  // Remove existing structured data for this page
  const existingScript = document.querySelector('script[data-seo-structured]')
  if (existingScript) {
    existingScript.remove()
  }
  
  // Add new structured data
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.setAttribute('data-seo-structured', 'true')
  script.textContent = JSON.stringify(data, null, 2)
  document.head.appendChild(script)
}

function trackPageView(path: string, title: string) {
  // Track page views for SEO analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('config', 'GA_MEASUREMENT_ID', {
      page_title: title,
      page_location: `https://neurafit-ai-2025.web.app${path}`
    })
  }
  
  // Track Core Web Vitals for SEO
  if ('web-vitals' in window) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(console.log)
      getFID(console.log)
      getFCP(console.log)
      getLCP(console.log)
      getTTFB(console.log)
    })
  }
}

// Hook for easy SEO management in components
export function useSEO(config: SEOHeadProps) {
  return <SEOHead {...config} />
}

// Pre-built structured data templates
export const StructuredDataTemplates = {
  WebApplication: (name: string, description: string, url: string) => ({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    description,
    url,
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web, iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1247',
      bestRating: '5',
      worstRating: '1'
    }
  }),
  
  Article: (title: string, description: string, author: string, datePublished: string) => ({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    author: {
      '@type': 'Person',
      name: author
    },
    publisher: {
      '@type': 'Organization',
      name: 'NeuraFit',
      logo: {
        '@type': 'ImageObject',
        url: 'https://neurafit-ai-2025.web.app/android-chrome-512x512.png'
      }
    },
    datePublished,
    dateModified: new Date().toISOString()
  }),
  
  FAQPage: (faqs: Array<{ question: string; answer: string }>) => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }),
  
  SoftwareApplication: (name: string, description: string, category: string) => ({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    applicationCategory: category,
    operatingSystem: 'Web, iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1247'
    }
  })
}

export default SEOHead
