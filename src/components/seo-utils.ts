/**
 * SEO Utilities
 * Shared utilities and templates for SEO management
 */

import type { SEOHeadProps } from './SEOHead'

// Hook for easy SEO management in components
export function useSEO(config: SEOHeadProps) {
  // This would need to be imported from SEOHead component
  // For now, return the config as this is just moving the export
  return config
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
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '9.99',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock'
    }
  }),

  Organization: (name: string, url: string, logo?: string) => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo: logo || `${url}/logo.svg`,
    sameAs: [
      // Add social media URLs here
    ]
  }),

  BreadcrumbList: (items: Array<{ name: string; url: string }>) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
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

  Article: (title: string, description: string, url: string, publishedDate: string, author: string) => ({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url,
    datePublished: publishedDate,
    dateModified: publishedDate,
    author: {
      '@type': 'Person',
      name: author
    },
    publisher: {
      '@type': 'Organization',
      name: 'NeuraFit',
      logo: {
        '@type': 'ImageObject',
        url: `${url}/logo.svg`
      }
    }
  })
}

// SEO best practices constants
export const SEO_CONSTANTS = {
  DEFAULT_TITLE: 'NeuraFit - AI-Powered Fitness Training',
  DEFAULT_DESCRIPTION: 'Transform your fitness journey with AI-powered workout generation, personalized training plans, and intelligent progress tracking.',
  DEFAULT_IMAGE: '/og-image.jpg',
  SITE_NAME: 'NeuraFit',
  TWITTER_HANDLE: '@neurafit',
  
  // Meta tag limits
  TITLE_MAX_LENGTH: 60,
  DESCRIPTION_MAX_LENGTH: 160,
  
  // Common keywords
  FITNESS_KEYWORDS: [
    'AI fitness',
    'workout generator',
    'personalized training',
    'fitness app',
    'exercise planning',
    'strength training',
    'cardio workouts',
    'fitness tracking'
  ]
}

// Utility functions for SEO
export const seoUtils = {
  truncateText: (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + '...'
  },

  generateTitle: (pageTitle?: string): string => {
    if (!pageTitle) return SEO_CONSTANTS.DEFAULT_TITLE
    return `${pageTitle} | ${SEO_CONSTANTS.SITE_NAME}`
  },

  generateKeywords: (customKeywords: string[] = []): string => {
    return [...SEO_CONSTANTS.FITNESS_KEYWORDS, ...customKeywords].join(', ')
  },

  generateCanonicalUrl: (path: string): string => {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://neurafit.app'
    return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
  }
}
