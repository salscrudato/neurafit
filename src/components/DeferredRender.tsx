/**
 * Deferred Render Component
 * 
 * Uses IntersectionObserver to defer rendering of heavy components
 * until they are about to enter the viewport. This improves initial
 * page load performance and reduces layout shift.
 */

import { useState, useEffect, useRef, type ReactNode } from 'react';

interface DeferredRenderProps {
  children: ReactNode;
  /** Placeholder to show while component is not visible */
  placeholder?: ReactNode;
  /** Root margin for IntersectionObserver (default: '200px' to load slightly before visible) */
  rootMargin?: string;
  /** Threshold for IntersectionObserver (default: 0) */
  threshold?: number;
  /** Minimum height for placeholder to prevent layout shift */
  minHeight?: string | number;
  /** Class name for wrapper */
  className?: string;
  /** Whether to unmount when out of view (default: false) */
  unmountOnExit?: boolean;
}

export function DeferredRender({
  children,
  placeholder,
  rootMargin = '200px',
  threshold = 0,
  minHeight,
  className,
  unmountOnExit = false,
}: DeferredRenderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Create IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setHasBeenVisible(true);
            
            // If we don't need to unmount on exit, we can disconnect after first intersection
            if (!unmountOnExit) {
              observer.disconnect();
            }
          } else if (unmountOnExit) {
            setIsVisible(false);
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold, unmountOnExit]);

  // Determine what to render
  const shouldRenderChildren = unmountOnExit ? isVisible : hasBeenVisible;

  // Calculate style for wrapper
  const wrapperStyle: { minHeight?: string } = minHeight
    ? { minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight }
    : {};

  return (
    <div ref={ref} className={className} style={wrapperStyle}>
      {shouldRenderChildren ? children : placeholder}
    </div>
  );
}

/**
 * Skeleton placeholder for charts
 */
export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="animate-pulse bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-xl"
      style={{ height: `${height}px` }}
    >
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading chart...</div>
      </div>
    </div>
  );
}

/**
 * Hook for manual IntersectionObserver usage
 */
export function useIntersectionObserver(
  options: { rootMargin?: string; threshold?: number } = {}
): [{ current: HTMLDivElement | null }, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsIntersecting(entry.isIntersecting);
        });
      },
      options
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return [ref, isIntersecting];
}

