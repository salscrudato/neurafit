/**
 * Optimized Image Component
 *
 * Provides lazy loading, responsive images, and proper accessibility
 * for optimal performance and user experience.
 */

import React, { useState, useEffect, useRef, type ImgHTMLAttributes } from 'react'

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
  /** Image source URL */
  src: string
  /** Alt text for accessibility (required) */
  alt: string
  /** Optional srcset for responsive images */
  srcSet?: string
  /** Optional sizes attribute for responsive images */
  sizes?: string
  /** Aspect ratio to prevent layout shift (e.g., '16/9', '4/3', '1/1') */
  aspectRatio?: string
  /** Placeholder to show while loading */
  placeholder?: 'blur' | 'shimmer' | 'none'
  /** Blur data URL for blur placeholder */
  blurDataURL?: string
  /** Priority loading (disables lazy loading) */
  priority?: boolean
  /** Callback when image loads */
  onLoad?: () => void
  /** Callback when image fails to load */
  onError?: () => void
  /** Additional CSS classes */
  className?: string
  /** Object fit style */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
}

export function OptimizedImage({
  src,
  alt,
  srcSet,
  sizes,
  aspectRatio,
  placeholder = 'shimmer',
  blurDataURL,
  priority = false,
  onLoad,
  onError,
  className = '',
  objectFit = 'cover',
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  // Handle image error
  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && imgRef.current) {
            const img = imgRef.current
            const dataSrc = img.dataset['src']
            if (dataSrc) {
              img.src = dataSrc
              const dataSrcset = img.dataset['srcset']
              if (dataSrcset) {
                img.srcset = dataSrcset
              }
              observer.disconnect()
            }
          }
        })
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [priority])

  // Determine placeholder style
  const getPlaceholderStyle = () => {
    if (placeholder === 'blur' && blurDataURL) {
      return {
        backgroundImage: `url(${blurDataURL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    }
    if (placeholder === 'shimmer') {
      return {
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s infinite',
      }
    }
    return {}
  }

  // Container style with aspect ratio
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    ...(aspectRatio && {
      aspectRatio,
    }),
  }

  // Image style
  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit,
    transition: 'opacity 0.3s ease-in-out',
    opacity: isLoaded ? 1 : 0,
  }

  return (
    <div style={containerStyle} className={className}>
      {/* Placeholder */}
      {!isLoaded && !hasError && placeholder !== 'none' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            ...getPlaceholderStyle(),
          }}
          aria-hidden="true"
        />
      )}

      {/* Error state */}
      {hasError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f3f4f6',
            color: '#6b7280',
            fontSize: '0.875rem',
          }}
        >
          Failed to load image
        </div>
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        {...(priority
          ? { src, srcSet }
          : { 'data-src': src, 'data-srcset': srcSet })}
        alt={alt}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        style={imageStyle}
        {...props}
      />
    </div>
  )
}

/**
 * Avatar component with optimized image loading
 */
interface AvatarProps {
  src?: string
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fallback?: string
  className?: string
}

export function Avatar({ src, alt, size = 'md', fallback, className = '' }: AvatarProps) {
  const [hasError, setHasError] = useState(false)

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  }

  const sizeClass = sizeClasses[size]

  // Show fallback if no src or error
  if (!src || hasError) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold ${className}`}
        aria-label={alt}
      >
        {fallback || alt.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      aspectRatio="1/1"
      objectFit="cover"
      className={`${sizeClass} rounded-full ${className}`}
      onError={() => setHasError(true)}
      priority
    />
  )
}

