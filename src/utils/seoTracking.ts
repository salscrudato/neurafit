// SEO Performance Tracking and Analytics for NeuraFit
// Comprehensive monitoring system for SEO metrics and performance

interface SEOTrackingConfig {
  googleAnalyticsId?: string
  googleSearchConsoleId?: string
  hotjarId?: string
  clarityId?: string
  enableDebugMode?: boolean
}

interface KeywordRankingData {
  keyword: string
  position: number
  previousPosition: number
  url: string
  searchVolume: number
  difficulty: number
  lastUpdated: string
  trend: 'up' | 'down' | 'stable'
}

interface SEOMetrics {
  organicTraffic: number
  keywordRankings: KeywordRankingData[]
  coreWebVitals: {
    lcp: number
    fid: number
    cls: number
    fcp: number
    ttfb: number
  }
  technicalSEO: {
    indexedPages: number
    crawlErrors: number
    sitemapStatus: string
    robotsStatus: string
  }
  contentMetrics: {
    avgTimeOnPage: number
    bounceRate: number
    pagesPerSession: number
    organicConversionRate: number
  }
}

class SEOTracker {
  private config: SEOTrackingConfig
  private metrics: SEOMetrics
  private trackingQueue: Array<{ event: string; data: any; timestamp: number }> = []

  constructor(config: SEOTrackingConfig = {}) {
    this.config = {
      enableDebugMode: false,
      ...config
    }
    
    this.metrics = this.initializeMetrics()
    this.setupTracking()
  }

  private initializeMetrics(): SEOMetrics {
    return {
      organicTraffic: 0,
      keywordRankings: [
        { keyword: 'AI workout generator', position: 0, previousPosition: 0, url: '/', searchVolume: 8100, difficulty: 65, lastUpdated: '', trend: 'stable' },
        { keyword: 'personalized fitness app', position: 0, previousPosition: 0, url: '/', searchVolume: 5400, difficulty: 58, lastUpdated: '', trend: 'stable' },
        { keyword: 'custom workout plans', position: 0, previousPosition: 0, url: '/generate', searchVolume: 12100, difficulty: 72, lastUpdated: '', trend: 'stable' },
        { keyword: 'AI fitness trainer', position: 0, previousPosition: 0, url: '/', searchVolume: 2900, difficulty: 55, lastUpdated: '', trend: 'stable' },
        { keyword: 'workout planner app', position: 0, previousPosition: 0, url: '/generate', searchVolume: 6600, difficulty: 61, lastUpdated: '', trend: 'stable' }
      ],
      coreWebVitals: {
        lcp: 0,
        fid: 0,
        cls: 0,
        fcp: 0,
        ttfb: 0
      },
      technicalSEO: {
        indexedPages: 0,
        crawlErrors: 0,
        sitemapStatus: 'unknown',
        robotsStatus: 'unknown'
      },
      contentMetrics: {
        avgTimeOnPage: 0,
        bounceRate: 0,
        pagesPerSession: 0,
        organicConversionRate: 0
      }
    }
  }

  private setupTracking() {
    // Initialize Google Analytics 4
    this.initializeGA4()
    
    // Setup Core Web Vitals tracking
    this.trackCoreWebVitals()
    
    // Monitor technical SEO elements
    this.monitorTechnicalSEO()
    
    // Track user behavior for SEO signals
    this.trackUserBehavior()
    
    // Setup conversion tracking
    this.setupConversionTracking()
  }

  private initializeGA4() {
    if (!this.config.googleAnalyticsId) return

    // Load Google Analytics 4
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.googleAnalyticsId}`
    document.head.appendChild(script)

    // Initialize gtag
    window.dataLayer = window.dataLayer || []
    function gtag(...args: any[]) {
      window.dataLayer.push(args)
    }
    
    gtag('js', new Date())
    gtag('config', this.config.googleAnalyticsId, {
      // Enhanced ecommerce for conversion tracking
      enhanced_ecommerce: true,
      // Custom parameters for SEO tracking
      custom_map: {
        custom_parameter_1: 'seo_source',
        custom_parameter_2: 'keyword_ranking',
        custom_parameter_3: 'content_type'
      }
    })

    // Make gtag globally available
    ;(window as any).gtag = gtag
  }

  private async trackCoreWebVitals() {
    try {
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals')
      
      getCLS((metric) => {
        this.metrics.coreWebVitals.cls = metric.value
        this.reportWebVital('CLS', metric.value, 0.1)
      })
      
      getFID((metric) => {
        this.metrics.coreWebVitals.fid = metric.value
        this.reportWebVital('FID', metric.value, 100)
      })
      
      getFCP((metric) => {
        this.metrics.coreWebVitals.fcp = metric.value
        this.reportWebVital('FCP', metric.value, 1800)
      })
      
      getLCP((metric) => {
        this.metrics.coreWebVitals.lcp = metric.value
        this.reportWebVital('LCP', metric.value, 2500)
      })
      
      getTTFB((metric) => {
        this.metrics.coreWebVitals.ttfb = metric.value
        this.reportWebVital('TTFB', metric.value, 800)
      })
    } catch (error) {
      console.warn('Web Vitals tracking failed:', error)
    }
  }

  private monitorTechnicalSEO() {
    // Check sitemap accessibility
    fetch('/sitemap.xml')
      .then(response => {
        this.metrics.technicalSEO.sitemapStatus = response.ok ? 'accessible' : 'error'
        this.trackEvent('technical_seo', 'sitemap_check', this.metrics.technicalSEO.sitemapStatus)
      })
      .catch(() => {
        this.metrics.technicalSEO.sitemapStatus = 'error'
      })

    // Check robots.txt
    fetch('/robots.txt')
      .then(response => {
        this.metrics.technicalSEO.robotsStatus = response.ok ? 'accessible' : 'error'
        this.trackEvent('technical_seo', 'robots_check', this.metrics.technicalSEO.robotsStatus)
      })
      .catch(() => {
        this.metrics.technicalSEO.robotsStatus = 'error'
      })

    // Monitor page indexability
    this.checkPageIndexability()
  }

  private checkPageIndexability() {
    const metaRobots = document.querySelector('meta[name="robots"]')?.getAttribute('content') || ''
    const canonicalUrl = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || ''
    
    const indexabilityIssues = []
    
    if (metaRobots.includes('noindex')) {
      indexabilityIssues.push('noindex_directive')
    }
    
    if (!canonicalUrl) {
      indexabilityIssues.push('missing_canonical')
    }
    
    if (indexabilityIssues.length > 0) {
      this.trackEvent('technical_seo', 'indexability_issues', indexabilityIssues.join(','))
    }
  }

  private trackUserBehavior() {
    let sessionStart = Date.now()
    let scrollDepth = 0
    let maxScrollDepth = 0
    let interactions = 0

    // Track scroll depth for content engagement
    const trackScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      scrollDepth = Math.round((scrollTop / docHeight) * 100)
      
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth
        
        // Track milestone scroll depths
        if ([25, 50, 75, 90].includes(maxScrollDepth)) {
          this.trackEvent('user_engagement', 'scroll_depth', `${maxScrollDepth}%`)
        }
      }
    }

    // Track user interactions
    const trackInteraction = (event: Event) => {
      interactions++
      const target = event.target as HTMLElement
      
      if (target.tagName === 'BUTTON' || target.tagName === 'A') {
        this.trackEvent('user_engagement', 'interaction', {
          element: target.tagName,
          text: target.textContent?.slice(0, 50) || '',
          timestamp: Date.now() - sessionStart
        })
      }
    }

    // Track session duration on page unload
    const trackSessionEnd = () => {
      const sessionDuration = Date.now() - sessionStart
      this.trackEvent('user_engagement', 'session_duration', Math.round(sessionDuration / 1000))
      this.trackEvent('user_engagement', 'final_scroll_depth', maxScrollDepth)
      this.trackEvent('user_engagement', 'total_interactions', interactions)
    }

    // Event listeners
    window.addEventListener('scroll', trackScroll, { passive: true })
    document.addEventListener('click', trackInteraction)
    window.addEventListener('beforeunload', trackSessionEnd)
  }

  private setupConversionTracking() {
    // Track key conversion events
    this.trackConversion('page_view', {
      page_title: document.title,
      page_location: window.location.href,
      content_group1: this.getContentGroup()
    })

    // Track workout generation as conversion
    this.observeWorkoutGeneration()
    
    // Track subscription conversions
    this.observeSubscriptionEvents()
  }

  private getContentGroup(): string {
    const path = window.location.pathname
    if (path === '/') return 'homepage'
    if (path === '/generate') return 'workout_generator'
    if (path === '/dashboard') return 'user_dashboard'
    if (path === '/subscription') return 'subscription'
    return 'other'
  }

  private observeWorkoutGeneration() {
    // Monitor for workout generation events
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes)
          addedNodes.forEach((node) => {
            if (node instanceof Element && node.textContent?.includes('workout generated')) {
              this.trackConversion('workout_generated', {
                event_category: 'engagement',
                event_label: 'ai_workout_creation',
                value: 1
              })
            }
          })
        }
      })
    })

    observer.observe(document.body, { childList: true, subtree: true })
  }

  private observeSubscriptionEvents() {
    // Track subscription-related events
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      const text = target.textContent?.toLowerCase() || ''
      
      if (text.includes('subscribe') || text.includes('upgrade')) {
        this.trackConversion('subscription_intent', {
          event_category: 'conversion',
          event_label: 'subscription_click',
          value: 1
        })
      }
    })
  }

  // Public methods for tracking specific events
  public trackEvent(category: string, action: string, label?: string | object) {
    const eventData = {
      event_category: category,
      event_action: action,
      event_label: typeof label === 'string' ? label : JSON.stringify(label),
      timestamp: Date.now()
    }

    this.trackingQueue.push({
      event: 'custom_event',
      data: eventData,
      timestamp: Date.now()
    })

    if ((window as any).gtag) {
      (window as any).gtag('event', action, eventData)
    }

    if (this.config.enableDebugMode) {
      console.log('SEO Event Tracked:', eventData)
    }
  }

  public trackConversion(conversionName: string, data: object) {
    const conversionData = {
      event_category: 'conversion',
      event_action: conversionName,
      ...data,
      timestamp: Date.now()
    }

    if ((window as any).gtag) {
      (window as any).gtag('event', 'conversion', conversionData)
    }

    this.trackEvent('conversion', conversionName, data)
  }

  public updateKeywordRanking(keyword: string, position: number) {
    const keywordData = this.metrics.keywordRankings.find(k => k.keyword === keyword)
    if (keywordData) {
      keywordData.previousPosition = keywordData.position
      keywordData.position = position
      keywordData.lastUpdated = new Date().toISOString()
      keywordData.trend = position < keywordData.previousPosition ? 'up' : 
                          position > keywordData.previousPosition ? 'down' : 'stable'
      
      this.trackEvent('seo_ranking', 'keyword_update', {
        keyword,
        position,
        trend: keywordData.trend
      })
    }
  }

  private reportWebVital(name: string, value: number, threshold: number) {
    const status = value <= threshold ? 'good' : value <= threshold * 1.5 ? 'needs-improvement' : 'poor'
    
    this.trackEvent('core_web_vitals', name.toLowerCase(), {
      value: Math.round(value),
      status,
      threshold
    })
  }

  public getMetrics(): SEOMetrics {
    return { ...this.metrics }
  }

  public exportAnalytics() {
    const analyticsData = {
      metrics: this.metrics,
      trackingQueue: this.trackingQueue,
      config: this.config,
      timestamp: new Date().toISOString(),
      url: window.location.href
    }

    const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `neurafit-seo-analytics-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

// Initialize SEO tracking
export const seoTracker = new SEOTracker({
  googleAnalyticsId: 'GA_MEASUREMENT_ID', // Replace with actual GA4 ID
  enableDebugMode: process.env.NODE_ENV === 'development'
})

// Hook for React components
export function useSEOTracking() {
  return {
    trackEvent: seoTracker.trackEvent.bind(seoTracker),
    trackConversion: seoTracker.trackConversion.bind(seoTracker),
    updateKeywordRanking: seoTracker.updateKeywordRanking.bind(seoTracker),
    getMetrics: seoTracker.getMetrics.bind(seoTracker),
    exportAnalytics: seoTracker.exportAnalytics.bind(seoTracker)
  }
}

// Export for use in components
export default SEOTracker
