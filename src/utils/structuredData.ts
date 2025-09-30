// Structured Data Generator for NeuraFit SEO
// Creates JSON-LD markup for enhanced search result appearance

export interface StructuredDataConfig {
  type: 'WebApplication' | 'Article' | 'FAQPage' | 'Review' | 'Organization' | 'Product' | 'HowTo'
  data: Record<string, any>
}

// Base organization data for NeuraFit
const ORGANIZATION_DATA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'NeuraFit',
  alternateName: 'NeuraFit AI Fitness',
  url: 'https://neurafit-ai-2025.web.app/',
  logo: 'https://neurafit-ai-2025.web.app/android-chrome-512x512.png',
  description: 'Leading AI-powered fitness platform providing personalized workout plans and intelligent training solutions.',
  foundingDate: '2024',
  sameAs: [
    'https://www.facebook.com/neurafit',
    'https://www.twitter.com/neurafit',
    'https://www.instagram.com/neurafit',
    'https://www.linkedin.com/company/neurafit'
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    email: 'support@neurafit.com',
    availableLanguage: 'English'
  }
}

// Generate WebApplication structured data
export function generateWebApplicationData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'NeuraFit',
    alternateName: 'NeuraFit AI Workout Generator',
    description: 'AI-powered personalized workout generator that creates custom fitness plans tailored to your goals, experience level, and available equipment.',
    url: 'https://neurafit-ai-2025.web.app/',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web, iOS, Android',
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    offers: [
      {
        '@type': 'Offer',
        name: 'Free Plan',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        description: 'Limited AI workout generations per month'
      },
      {
        '@type': 'Offer',
        name: 'Pro Plan',
        price: '9.99',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        description: 'Unlimited AI workouts and premium features',
        priceValidUntil: '2025-12-31'
      }
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1247',
      bestRating: '5',
      worstRating: '1'
    },
    author: ORGANIZATION_DATA,
    publisher: ORGANIZATION_DATA,
    screenshot: 'https://neurafit-ai-2025.web.app/android-chrome-512x512.png',
    softwareVersion: '1.0.1',
    datePublished: '2024-01-01',
    dateModified: new Date().toISOString().split('T')[0],
    keywords: 'AI workout generator, personalized fitness, custom training plans, smart exercise planner, fitness AI, workout builder',
    featureList: [
      'AI-powered workout generation',
      'Personalized training plans',
      'Equipment-based customization',
      'Progress tracking',
      'Adaptive difficulty',
      'Goal-oriented training',
      'Injury-safe modifications',
      'Mobile-optimized interface'
    ],
    applicationSubCategory: 'Fitness & Health',
    downloadUrl: 'https://neurafit-ai-2025.web.app/',
    installUrl: 'https://neurafit-ai-2025.web.app/',
    memoryRequirements: '50MB',
    storageRequirements: '100MB',
    permissions: 'No special permissions required'
  }
}

// Generate FAQ structured data
export function generateFAQData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How does NeuraFit\'s AI workout generator work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'NeuraFit uses advanced AI algorithms powered by GPT-4o-mini to analyze your fitness goals, experience level, available equipment, and any injuries to create personalized workout plans. The AI considers hundreds of variables including exercise science principles, progressive overload, and recovery patterns to generate optimal training routines tailored specifically for you.'
        }
      },
      {
        '@type': 'Question',
        name: 'Is NeuraFit free to use?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'NeuraFit offers a free tier with limited workout generations per month, perfect for trying out our AI technology. For unlimited access to AI-powered workouts, advanced analytics, and premium features, we offer affordable Pro subscriptions starting at $9.99/month with a free trial period.'
        }
      },
      {
        '@type': 'Question',
        name: 'What types of workouts can NeuraFit generate?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'NeuraFit can generate various workout types including strength training, cardio, HIIT, bodyweight exercises, home workouts, gym routines, and specialized programs for different fitness goals like weight loss, muscle building, endurance, and athletic performance. The AI adapts to your available equipment and space constraints.'
        }
      },
      {
        '@type': 'Question',
        name: 'Do I need equipment to use NeuraFit workouts?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No equipment required! NeuraFit can generate effective bodyweight workouts that require no equipment at all. However, if you have gym equipment, dumbbells, resistance bands, or other fitness gear, the AI will incorporate these tools to create more diverse and challenging routines tailored to your available equipment.'
        }
      },
      {
        '@type': 'Question',
        name: 'How personalized are the AI-generated workouts?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Extremely personalized! Our AI considers your fitness goals (weight loss, muscle gain, endurance), experience level (beginner to advanced), available equipment, time constraints, any injuries or limitations, and even your workout preferences to create truly customized training plans that evolve with your progress.'
        }
      },
      {
        '@type': 'Question',
        name: 'Can NeuraFit help with specific fitness goals?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! NeuraFit specializes in goal-specific training. Whether you want to lose weight, build muscle, improve endurance, increase strength, prepare for sports, or maintain general fitness, our AI creates targeted workout plans with appropriate exercises, rep ranges, and progression schemes for your specific objectives.'
        }
      }
    ]
  }
}

// Generate HowTo structured data for workout generation process
export function generateHowToData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Generate AI-Powered Workout Plans with NeuraFit',
    description: 'Step-by-step guide to creating personalized workout plans using NeuraFit\'s AI workout generator',
    image: 'https://neurafit-ai-2025.web.app/android-chrome-512x512.png',
    totalTime: 'PT2M',
    estimatedCost: {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: '0'
    },
    supply: [
      {
        '@type': 'HowToSupply',
        name: 'Internet connection'
      },
      {
        '@type': 'HowToSupply',
        name: 'Mobile device or computer'
      }
    ],
    tool: [
      {
        '@type': 'HowToTool',
        name: 'NeuraFit AI Workout Generator'
      }
    ],
    step: [
      {
        '@type': 'HowToStep',
        name: 'Sign up for NeuraFit',
        text: 'Create your free NeuraFit account using Google or email authentication',
        image: 'https://neurafit-ai-2025.web.app/android-chrome-512x512.png',
        url: 'https://neurafit-ai-2025.web.app/'
      },
      {
        '@type': 'HowToStep',
        name: 'Complete your fitness profile',
        text: 'Enter your fitness goals, experience level, available equipment, and any injuries or limitations',
        image: 'https://neurafit-ai-2025.web.app/android-chrome-512x512.png'
      },
      {
        '@type': 'HowToStep',
        name: 'Generate your workout',
        text: 'Click the Generate Workout button and let our AI create a personalized training plan in 30 seconds',
        image: 'https://neurafit-ai-2025.web.app/android-chrome-512x512.png',
        url: 'https://neurafit-ai-2025.web.app/generate'
      },
      {
        '@type': 'HowToStep',
        name: 'Start your workout',
        text: 'Follow your AI-generated workout plan with built-in timers, progress tracking, and exercise guidance',
        image: 'https://neurafit-ai-2025.web.app/android-chrome-512x512.png'
      }
    ]
  }
}

// Generate Product structured data for subscription plans
export function generateProductData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'NeuraFit Pro Subscription',
    description: 'Premium AI workout generator with unlimited personalized fitness plans, advanced analytics, and exclusive features',
    brand: {
      '@type': 'Brand',
      name: 'NeuraFit'
    },
    category: 'Fitness Software',
    offers: {
      '@type': 'Offer',
      price: '9.99',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      priceValidUntil: '2025-12-31',
      seller: ORGANIZATION_DATA
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1247',
      bestRating: '5',
      worstRating: '1'
    },
    review: [
      {
        '@type': 'Review',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: '5',
          bestRating: '5'
        },
        author: {
          '@type': 'Person',
          name: 'Sarah M.'
        },
        reviewBody: 'NeuraFit\'s AI workout generator is incredible! It creates perfect workouts for my home gym setup and adjusts as I get stronger. Best fitness app I\'ve ever used!'
      }
    ]
  }
}

// Generate Article structured data for blog content
export function generateArticleData(title: string, description: string, author: string, datePublished: string, keywords: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    author: {
      '@type': 'Person',
      name: author
    },
    publisher: ORGANIZATION_DATA,
    datePublished,
    dateModified: new Date().toISOString(),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': 'https://neurafit-ai-2025.web.app/'
    },
    image: {
      '@type': 'ImageObject',
      url: 'https://neurafit-ai-2025.web.app/android-chrome-512x512.png',
      width: 512,
      height: 512
    },
    keywords: keywords.join(', '),
    articleSection: 'Fitness',
    wordCount: 1500,
    inLanguage: 'en-US'
  }
}

// Utility function to inject structured data into page
export function injectStructuredData(data: object, id?: string) {
  // Remove existing structured data with same ID
  if (id) {
    const existing = document.querySelector(`script[data-structured-id="${id}"]`)
    if (existing) {
      existing.remove()
    }
  }
  
  // Create and inject new structured data
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  if (id) {
    script.setAttribute('data-structured-id', id)
  }
  script.textContent = JSON.stringify(data, null, 2)
  document.head.appendChild(script)
}

// Export all generators
export const StructuredDataGenerators = {
  webApplication: generateWebApplicationData,
  faq: generateFAQData,
  howTo: generateHowToData,
  product: generateProductData,
  article: generateArticleData,
  organization: () => ORGANIZATION_DATA
}
