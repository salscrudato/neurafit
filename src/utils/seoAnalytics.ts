// SEO Analytics and Performance Monitoring for NeuraFit
// Tracks Core Web Vitals, keyword rankings, and SEO performance metrics

interface SEOMetrics {
  lcp: number // Largest Contentful Paint
  fid: number // First Input Delay
  cls: number // Cumulative Layout Shift
  fcp: number // First Contentful Paint
  ttfb: number // Time to First Byte
}

interface KeywordTracking {
  keyword: string
  position: number
  url: string
  searchVolume: number
  difficulty: number
  lastChecked: string
}

interface SEOAnalyticsData {
  pageUrl: string
  title: string
  description: string
  keywords: string[]
  metrics: SEOMetrics
  timestamp: string
  userAgent: string
  viewport: string
}

class SEOAnalytics {
  private metrics: SEOMetrics = {
    lcp: 0,
    fid: 0,
    cls: 0,
    fcp: 0,
    ttfb: 0
  }

  private keywordData: KeywordTracking[] = [
    { keyword: 'AI workout generator', position: 0, url: '/', searchVolume: 8100, difficulty: 65, lastChecked: '' },
    { keyword: 'personalized fitness app', position: 0, url: '/', searchVolume: 5400, difficulty: 58, lastChecked: '' },
    { keyword: 'custom workout plans', position: 0, url: '/generate', searchVolume: 12100, difficulty: 72, lastChecked: '' },
    { keyword: 'AI fitness trainer', position: 0, url: '/', searchVolume: 2900, difficulty: 55, lastChecked: '' },
    { keyword: 'workout planner app', position: 0, url: '/generate', searchVolume: 6600, difficulty: 61, lastChecked: '' }
  ]

  constructor() {
    this.initializeTracking()
  }

  private initializeTracking() {
    // Track Core Web Vitals
    this.trackCoreWebVitals()
    
    // Track page performance
    this.trackPagePerformance()
    
    // Track user interactions for SEO signals
    this.trackUserEngagement()
    
    // Monitor technical SEO elements
    this.monitorTechnicalSEO()
  }

  private async trackCoreWebVitals() {
    try {
      // Dynamic import to avoid bundle size impact
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals')
      
      getCLS((metric) => {
        this.metrics.cls = metric.value
        this.reportMetric('CLS', metric.value, 0.1) // Good: < 0.1
      })
      
      getFID((metric) => {
        this.metrics.fid = metric.value
        this.reportMetric('FID', metric.value, 100) // Good: < 100ms
      })
      
      getFCP((metric) => {
        this.metrics.fcp = metric.value
        this.reportMetric('FCP', metric.value, 1800) // Good: < 1.8s
      })
      
      getLCP((metric) => {
        this.metrics.lcp = metric.value
        this.reportMetric('LCP', metric.value, 2500) // Good: < 2.5s
      })
      
      getTTFB((metric) => {
        this.metrics.ttfb = metric.value
        this.reportMetric('TTFB', metric.value, 800) // Good: < 800ms
      })
    } catch (error) {
      console.warn('Web Vitals tracking not available:', error)
    }
  }

  private trackPagePerformance() {
    // Track page load performance
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      if (navigation) {
        const metrics = {
          dns: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcp: navigation.connectEnd - navigation.connectStart,
          request: navigation.responseStart - navigation.requestStart,
          response: navigation.responseEnd - navigation.responseStart,
          dom: navigation.domContentLoadedEventEnd - navigation.responseEnd,
          load: navigation.loadEventEnd - navigation.loadEventStart
        }
        
        this.reportPageTiming(metrics)
      }
    })
  }

  private trackUserEngagement() {
    let startTime = Date.now()
    let scrollDepth = 0
    let maxScrollDepth = 0
    
    // Track time on page
    const trackTimeOnPage = () => {
      const timeOnPage = Date.now() - startTime
      this.reportEngagement('timeOnPage', timeOnPage)
    }
    
    // Track scroll depth
    const trackScrollDepth = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      scrollDepth = Math.round((scrollTop / docHeight) * 100)
      
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth
        this.reportEngagement('scrollDepth', maxScrollDepth)
      }
    }
    
    // Track clicks and interactions
    const trackInteractions = (event: Event) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.getAttribute('role') === 'button') {
        this.reportEngagement('interaction', {
          type: event.type,
          element: target.tagName,
          text: target.textContent?.slice(0, 50) || '',
          timestamp: Date.now()
        })
      }
    }
    
    // Event listeners
    window.addEventListener('beforeunload', trackTimeOnPage)
    window.addEventListener('scroll', trackScrollDepth, { passive: true })
    document.addEventListener('click', trackInteractions)
    document.addEventListener('touchstart', trackInteractions, { passive: true })
  }

  private monitorTechnicalSEO() {
    // Check for common SEO issues
    const issues: string[] = []
    
    // Check title tag
    const title = document.title
    if (!title) issues.push('Missing title tag')
    else if (title.length > 60) issues.push('Title tag too long')
    else if (title.length < 30) issues.push('Title tag too short')
    
    // Check meta description
    const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content')
    if (!metaDesc) issues.push('Missing meta description')
    else if (metaDesc.length > 160) issues.push('Meta description too long')
    else if (metaDesc.length < 120) issues.push('Meta description too short')
    
    // Check H1 tag
    const h1Tags = document.querySelectorAll('h1')
    if (h1Tags.length === 0) issues.push('Missing H1 tag')
    else if (h1Tags.length > 1) issues.push('Multiple H1 tags')
    
    // Check canonical URL
    const canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) issues.push('Missing canonical URL')
    
    // Check structured data
    const structuredData = document.querySelectorAll('script[type="application/ld+json"]')
    if (structuredData.length === 0) issues.push('Missing structured data')
    
    // Report issues
    if (issues.length > 0) {
      this.reportSEOIssues(issues)
    }
  }

  private reportMetric(name: string, value: number, threshold: number) {
    const status = value <= threshold ? 'good' : value <= threshold * 1.5 ? 'needs-improvement' : 'poor'
    
    console.log(`SEO Metric - ${name}: ${value} (${status})`)
    
    // Send to analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'web_vitals', {
        event_category: 'SEO',
        event_label: name,
        value: Math.round(value),
        custom_parameter_1: status
      })
    }
  }

  private reportPageTiming(metrics: Record<string, number>) {
    console.log('Page Performance Metrics:', metrics)
    
    // Identify slow components
    const slowComponents = Object.entries(metrics)
      .filter(([_, value]) => value > 1000) // > 1 second
      .map(([key, value]) => `${key}: ${value}ms`)
    
    if (slowComponents.length > 0) {
      console.warn('Slow page components detected:', slowComponents)
    }
  }

  private reportEngagement(type: string, data: any) {
    // Track engagement metrics for SEO signals
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'user_engagement', {
        event_category: 'SEO',
        event_label: type,
        value: typeof data === 'number' ? data : 1,
        custom_parameter_1: JSON.stringify(data)
      })
    }
  }

  private reportSEOIssues(issues: string[]) {
    console.warn('SEO Issues Detected:', issues)
    
    // Send to error tracking
    if (typeof window !== 'undefined' && (window as any).gtag) {
      issues.forEach(issue => {
        (window as any).gtag('event', 'seo_issue', {
          event_category: 'SEO',
          event_label: issue,
          value: 1
        })
      })
    }
  }

  // Public methods for manual tracking
  public trackKeywordRanking(keyword: string, position: number, url: string) {
    const keywordIndex = this.keywordData.findIndex(k => k.keyword === keyword)
    if (keywordIndex !== -1) {
      this.keywordData[keywordIndex].position = position
      this.keywordData[keywordIndex].lastChecked = new Date().toISOString()
    }
    
    console.log(`Keyword Ranking - "${keyword}": Position ${position} for ${url}`)
  }

  public getPerformanceReport(): SEOAnalyticsData {
    return {
      pageUrl: window.location.href,
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      keywords: (document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '').split(', '),
      metrics: this.metrics,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`
    }
  }

  public exportSEOData() {
    const data = {
      performance: this.getPerformanceReport(),
      keywords: this.keywordData,
      timestamp: new Date().toISOString()
    }
    
    // Create downloadable JSON file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `neurafit-seo-data-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

// Initialize SEO analytics
export const seoAnalytics = new SEOAnalytics()

// Export for use in components
export default SEOAnalytics
