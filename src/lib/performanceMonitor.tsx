import React from 'react';

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

class PerformanceMonitor {
  private observer: PerformanceObserver | null = null;
  private memoryCheckInterval: NodeJS.Timeout | null = null;
  private readonly MEMORY_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly PERFORMANCE_BUDGET = {
    FCP: 2000, // First Contentful Paint
    LCP: 2500, // Largest Contentful Paint
    FID: 100, // First Input Delay
    CLS: 0.1, // Cumulative Layout Shift
    TTFB: 600, // Time to First Byte
  };

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined') return;

    // Only enable full monitoring in production
    if (process.env.NODE_ENV === 'production') {
      // Initialize performance observer
      this.setupPerformanceObserver();

      // Monitor memory usage
      this.setupMemoryMonitoring();

      // Monitor Core Web Vitals
      this.setupWebVitalsMonitoring();

      // Monitor bundle loading
      this.setupBundleMonitoring();

      // Setup cleanup on page unload
      window.addEventListener('beforeunload', this.cleanup.bind(this));
    } else {
      // In development, only do basic monitoring to avoid console noise
      this.setupBundleMonitoring();
    }
  }

  private setupPerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.processPerformanceEntries(entries);
      });

      // Observe different types of performance entries
      this.observer.observe({ entryTypes: ['navigation', 'resource', 'measure', 'paint'] });
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  }

  private setupMemoryMonitoring(): void {
    if (!('memory' in performance)) return;

    this.memoryCheckInterval = setInterval(() => {
      const memory = (performance as Performance & { memory?: MemoryInfo }).memory;

      if (!memory) return;

      const memoryUsage = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
      };

      // Warn if memory usage is high
      if (memoryUsage.used > memoryUsage.limit * 0.8) {
        console.warn('High memory usage detected:', memoryUsage);
        this.suggestMemoryOptimizations();
      }
    }, this.MEMORY_CHECK_INTERVAL);
  }

  private setupWebVitalsMonitoring(): void {
    // Monitor First Contentful Paint - check if supported first
    try {
      // Check if the entry type is supported before observing
      if (PerformanceObserver.supportedEntryTypes?.includes('paint')) {
        this.observeWebVital('first-contentful-paint', (entry) => {
          const fcp = entry.startTime;

          if (fcp > this.PERFORMANCE_BUDGET.FCP) {
            console.warn(`FCP exceeded budget: ${fcp}ms > ${this.PERFORMANCE_BUDGET.FCP}ms`);
          }
        });
      }
    } catch {
      // FCP not supported in this browser, skip silently
      if (process.env.NODE_ENV === 'development') {
        console.debug('First Contentful Paint monitoring not supported in this browser');
      }
    }

    // Monitor Largest Contentful Paint
    if (PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint')) {
      this.observeWebVital('largest-contentful-paint', (entry) => {
        const lcp = entry.startTime;

        if (lcp > this.PERFORMANCE_BUDGET.LCP) {
          console.warn(`LCP exceeded budget: ${lcp}ms > ${this.PERFORMANCE_BUDGET.LCP}ms`);
        }
      });
    }

    // Monitor Cumulative Layout Shift
    if (PerformanceObserver.supportedEntryTypes?.includes('layout-shift')) {
      this.observeWebVital('layout-shift', (entry) => {
        if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
          const cls = (entry as PerformanceEntry & { value?: number }).value || 0;

          if (cls > this.PERFORMANCE_BUDGET.CLS) {
            console.warn(`CLS exceeded budget: ${cls} > ${this.PERFORMANCE_BUDGET.CLS}`);
          }
        }
      });
    }
  }

  private setupBundleMonitoring(): void {
    // Monitor when the main bundle loads
    window.addEventListener('load', () => {
      // Check for unused JavaScript
      this.analyzeCodeUsage();
    });
  }

  private observeWebVital(type: string, callback: (_entry: PerformanceEntry) => void): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      // Check if the entry type is supported before creating observer
      if (!PerformanceObserver.supportedEntryTypes?.includes(type)) {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`Performance entry type '${type}' is not supported in this browser`);
        }
        return;
      }

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(callback);
      });

      observer.observe({ type, buffered: true });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Failed to observe ${type}:`, error);
      }
    }
  }

  private processPerformanceEntries(entries: PerformanceEntry[]): void {
    entries.forEach((entry) => {
      // Log slow resources
      if (entry.entryType === 'resource' && entry.duration > 1000) {
        console.warn('Slow resource detected:', {
          name: entry.name,
          duration: entry.duration,
          type: entry.entryType,
        });
      }

      // Log slow navigation
      if (entry.entryType === 'navigation' && entry.duration > 3000) {
        console.warn('Slow navigation detected:', {
          duration: entry.duration,
          type: entry.entryType,
        });
      }
    });
  }

  private analyzeCodeUsage(): void {
    // This would integrate with coverage tools in a real implementation
    // For now, we'll just log bundle sizes
    if ('getEntriesByType' in performance) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      const jsResources = resources.filter(
        (resource) => resource.name.includes('.js') && resource.name.includes(window.location.origin)
      );

      const totalJSSize = jsResources.reduce((total, resource) => {
        return total + (resource.transferSize || 0);
      }, 0);

      console.log('JavaScript bundle analysis:', {
        files: jsResources.length,
        totalSize: `${Math.round(totalJSSize / 1024)}KB`,
        resources: jsResources.map((r) => ({
          name: r.name.split('/').pop(),
          size: `${Math.round((r.transferSize || 0) / 1024)}KB`,
          loadTime: `${Math.round(r.duration)}ms`,
        })),
      });
    }
  }

  private suggestMemoryOptimizations(): void {
    console.group('Memory Optimization Suggestions');
    console.log('• Clear unused caches');
    console.log('• Remove event listeners from unmounted components');
    console.log('• Optimize image sizes and formats');
    console.log('• Consider lazy loading more components');
    console.groupEnd();
  }

  // Public methods for manual performance tracking
  public startMeasure(name: string): void {
    if ('mark' in performance) {
      performance.mark(`${name}-start`);
    }
  }

  public endMeasure(name: string): number {
    if ('mark' in performance && 'measure' in performance) {
      const startMark = `${name}-start`;
      const endMark = `${name}-end`;

      // Check if start mark exists
      const startMarks = performance.getEntriesByName(startMark, 'mark');
      if (startMarks.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Performance measure '${name}' ended without being started`);
        }
        return 0;
      }

      performance.mark(endMark);
      performance.measure(name, startMark, endMark);

      const measure = performance.getEntriesByName(name, 'measure')[0];
      return measure ? measure.duration : 0;
    }
    return 0;
  }

  public measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasure(name);

    return fn().finally(() => {
      const duration = this.endMeasure(name);
      console.log(`${name} took ${Math.round(duration)}ms`);
    });
  }

  public measureSync<T>(name: string, fn: () => T): T {
    this.startMeasure(name);

    try {
      return fn();
    } finally {
      const duration = this.endMeasure(name);
      console.log(`${name} took ${Math.round(duration)}ms`);
    }
  }

  public getPerformanceReport(): Record<string, unknown> {
    return {
      recommendations: this.generateRecommendations(),
      timestamp: Date.now(),
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    return recommendations;
  }

  public cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  return {
    startMeasure: performanceMonitor.startMeasure.bind(performanceMonitor),
    endMeasure: performanceMonitor.endMeasure.bind(performanceMonitor),
    measureAsync: performanceMonitor.measureAsync.bind(performanceMonitor),
    measureSync: performanceMonitor.measureSync.bind(performanceMonitor),
    getReport: performanceMonitor.getPerformanceReport.bind(performanceMonitor),
  };
};

// Higher-order component for measuring component render time
export const withPerformanceTracking = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return React.memo((props: P) => {
    React.useEffect(() => {
      performanceMonitor.startMeasure(`${componentName}-render`);

      return () => {
        performanceMonitor.endMeasure(`${componentName}-render`);
      };
    }, []);

    return <Component {...props} />;
  });
};