// SEO Configuration for NeuraFit
// Centralized SEO settings and utilities for optimal search engine optimization

export interface SEOConfig {
  title: string
  description: string
  keywords: string[]
  ogTitle?: string
  ogDescription?: string
  twitterTitle?: string
  twitterDescription?: string
  canonical?: string
  noindex?: boolean
  nofollow?: boolean
}

// Primary keywords for NeuraFit (based on search volume and competition analysis)
export const PRIMARY_KEYWORDS = [
  'AI workout generator',
  'personalized fitness app',
  'custom workout plans',
  'AI fitness trainer',
  'smart exercise planner',
  'adaptive training program',
  'fitness AI',
  'workout builder',
  'personal trainer app',
  'intelligent fitness coaching'
]

// Long-tail keywords for specific pages
export const LONG_TAIL_KEYWORDS = [
  'AI powered workout generator free',
  'personalized fitness plans based on equipment',
  'custom workout routine generator',
  'AI fitness app for beginners',
  'smart workout planner with progress tracking',
  'adaptive exercise program creator',
  'personalized strength training AI',
  'custom cardio workout generator',
  'AI home gym workout planner',
  'intelligent fitness coaching app'
]

// Page-specific SEO configurations
export const SEO_CONFIGS: Record<string, SEOConfig> = {
  home: {
    title: 'NeuraFit - #1 AI Workout Generator | Personalized Fitness Plans 2024',
    description: '🏋️ Get AI-powered workout plans in 30 seconds! Personalized for your goals, equipment & fitness level. Join 10,000+ users transforming their fitness with smart training plans. Free trial!',
    keywords: [
      ...PRIMARY_KEYWORDS,
      'free workout generator',
      'fitness app 2024',
      'AI personal trainer',
      'workout planner online',
      'custom fitness program'
    ],
    ogTitle: 'NeuraFit - #1 AI Workout Generator | Get Fit with Smart Training',
    ogDescription: '🏋️ Transform your fitness with AI-powered workout plans! Personalized training in 30 seconds. Join 10,000+ users getting stronger with intelligent fitness coaching. Try free!',
    twitterTitle: 'NeuraFit - #1 AI Workout Generator | Smart Fitness Training',
    twitterDescription: '🏋️ Get personalized AI workouts in 30 seconds! Smart training plans for your goals & equipment. Join 10,000+ users transforming their fitness. Free trial!'
  },
  
  generate: {
    title: 'AI Workout Generator - Create Custom Fitness Plans | NeuraFit',
    description: '⚡ Generate personalized workouts instantly with AI! Input your goals, equipment & fitness level. Get custom training plans tailored for maximum results. Start free!',
    keywords: [
      'AI workout generator',
      'custom workout creator',
      'personalized exercise planner',
      'fitness plan generator',
      'workout routine builder',
      'AI exercise program',
      'smart training planner',
      'custom fitness routine'
    ],
    ogTitle: 'AI Workout Generator - Create Your Perfect Training Plan',
    ogDescription: '⚡ Generate personalized workouts instantly! AI creates custom training plans based on your goals, equipment & fitness level. Try the smart workout generator free!',
    canonical: '/generate'
  },
  
  dashboard: {
    title: 'Fitness Dashboard - Track Your AI Workout Progress | NeuraFit',
    description: '📊 Monitor your fitness journey with intelligent progress tracking. View workout history, strength gains, and AI-powered insights. Your personal fitness command center.',
    keywords: [
      'fitness dashboard',
      'workout progress tracker',
      'AI fitness analytics',
      'exercise history',
      'fitness metrics',
      'workout statistics',
      'training progress',
      'fitness insights'
    ],
    noindex: true // Private user content
  },
  
  history: {
    title: 'Workout History - Review Your Fitness Journey | NeuraFit',
    description: '📈 Review all your completed workouts and track your fitness progress. Analyze performance trends and celebrate your achievements with detailed workout history.',
    keywords: [
      'workout history',
      'fitness progress tracking',
      'exercise log',
      'training history',
      'workout analytics',
      'fitness journey',
      'exercise statistics',
      'performance tracking'
    ],
    noindex: true // Private user content
  },
  
  subscription: {
    title: 'NeuraFit Pro - Unlimited AI Workouts & Premium Features',
    description: '🚀 Unlock unlimited AI workout generation, advanced analytics, and premium features. Transform your fitness with NeuraFit Pro. Plans starting at $9.99/month.',
    keywords: [
      'NeuraFit Pro',
      'premium fitness app',
      'unlimited AI workouts',
      'fitness app subscription',
      'premium workout generator',
      'advanced fitness features',
      'pro fitness app',
      'unlimited training plans'
    ],
    ogTitle: 'NeuraFit Pro - Unlimited AI Workouts & Premium Features',
    ogDescription: '🚀 Get unlimited AI workout generation, advanced analytics & premium features. Transform your fitness journey with NeuraFit Pro. Start your free trial today!'
  },
  
  privacy: {
    title: 'Privacy Policy - How NeuraFit Protects Your Data',
    description: 'Learn how NeuraFit protects your personal information and fitness data. Our comprehensive privacy policy explains our data practices and your rights.',
    keywords: [
      'NeuraFit privacy policy',
      'fitness app privacy',
      'data protection',
      'user privacy',
      'fitness data security'
    ]
  },
  
  terms: {
    title: 'Terms of Service - NeuraFit Usage Agreement',
    description: 'Read NeuraFit\'s terms of service and usage agreement. Understand your rights and responsibilities when using our AI workout generator platform.',
    keywords: [
      'NeuraFit terms of service',
      'fitness app terms',
      'usage agreement',
      'user agreement',
      'service terms'
    ]
  }
}

// Utility function to get SEO config for a page
export function getSEOConfig(page: string): SEOConfig {
  return SEO_CONFIGS[page] || SEO_CONFIGS.home
}

// Generate meta keywords string
export function generateKeywords(keywords: string[]): string {
  return keywords.join(', ')
}

// Generate structured data for different page types
export function generateStructuredData(type: 'WebApplication' | 'Article' | 'FAQPage', data: Record<string, unknown>) {
  const baseStructure = {
    '@context': 'https://schema.org',
    '@type': type,
    ...data
  }
  
  return JSON.stringify(baseStructure, null, 2)
}

// SEO best practices constants
export const SEO_CONSTANTS = {
  TITLE_MAX_LENGTH: 60,
  DESCRIPTION_MAX_LENGTH: 160,
  KEYWORDS_MAX_COUNT: 15,
  H1_MAX_LENGTH: 70,
  ALT_TEXT_MAX_LENGTH: 125,
  
  // Core Web Vitals targets
  LCP_TARGET: 2.5, // seconds
  FID_TARGET: 100, // milliseconds
  CLS_TARGET: 0.1, // score
  
  // Social media image dimensions
  OG_IMAGE_WIDTH: 1200,
  OG_IMAGE_HEIGHT: 630,
  TWITTER_IMAGE_WIDTH: 1200,
  TWITTER_IMAGE_HEIGHT: 600
}

// URL structure for SEO-friendly paths
export const SEO_URLS = {
  HOME: '/',
  GENERATE: '/generate',
  DASHBOARD: '/dashboard',
  HISTORY: '/history',
  PROFILE: '/profile',
  SUBSCRIPTION: '/subscription',
  PRIVACY: '/privacy',
  TERMS: '/terms',
  
  // Future content URLs for SEO expansion
  BLOG: '/blog',
  WORKOUTS: '/workouts',
  EXERCISES: '/exercises',
  GUIDES: '/fitness-guides',
  REVIEWS: '/reviews'
}

export default SEO_CONFIGS
