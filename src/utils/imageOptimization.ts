/**
 * Image Optimization Utilities
 * 
 * Provides utilities for:
 * - Lazy loading images
 * - Responsive image loading
 * - Image compression
 * - WebP support detection
 */

/**
 * Check if browser supports WebP
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image()
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2)
    }
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'
  })
}

/**
 * Get optimized image URL based on device capabilities
 */
export function getOptimizedImageUrl(
  baseUrl: string,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'jpeg' | 'png'
  } = {}
): string {
  // If it's a data URL or external URL, return as-is
  if (baseUrl.startsWith('data:') || baseUrl.startsWith('http')) {
    return baseUrl
  }

  const { width, height, quality = 80, format } = options

  // Build query parameters for image optimization service
  const params = new URLSearchParams()
  
  if (width) params.append('w', width.toString())
  if (height) params.append('h', height.toString())
  if (quality) params.append('q', quality.toString())
  if (format) params.append('f', format)

  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(
  baseUrl: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
): string {
  return widths
    .map((width) => {
      const url = getOptimizedImageUrl(baseUrl, { width })
      return `${url} ${width}w`
    })
    .join(', ')
}

/**
 * Get appropriate image size based on viewport
 */
export function getResponsiveImageSize(): number {
  const width = window.innerWidth
  const dpr = window.devicePixelRatio || 1

  // Calculate optimal image width based on viewport and DPR
  if (width <= 640) return Math.ceil(640 * dpr)
  if (width <= 768) return Math.ceil(768 * dpr)
  if (width <= 1024) return Math.ceil(1024 * dpr)
  if (width <= 1280) return Math.ceil(1280 * dpr)
  return Math.ceil(1920 * dpr)
}

/**
 * Preload critical images
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })
}

/**
 * Preload multiple images
 */
export async function preloadImages(urls: string[]): Promise<void> {
  await Promise.all(urls.map(preloadImage))
}

/**
 * Lazy load image with intersection observer
 */
export function lazyLoadImage(
  img: HTMLImageElement,
  options: IntersectionObserverInit = {}
): () => void {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.01,
    ...options
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const target = entry.target as HTMLImageElement
        const src = target.dataset['src']
        const srcset = target.dataset['srcset']

        if (src) {
          target.src = src
          target.removeAttribute('data-src')
        }

        if (srcset) {
          target.srcset = srcset
          target.removeAttribute('data-srcset')
        }

        target.classList.remove('lazy')
        observer.unobserve(target)
      }
    })
  }, defaultOptions)

  observer.observe(img)

  // Return cleanup function
  return () => observer.disconnect()
}

/**
 * Compress image file
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
    mimeType?: string
  } = {}
): Promise<Blob> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    mimeType = 'image/jpeg'
  } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          mimeType,
          quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Convert image to WebP if supported
 */
export async function convertToWebP(
  file: File,
  quality: number = 0.8
): Promise<Blob> {
  const isSupported = await supportsWebP()

  if (!isSupported) {
    return file
  }

  return compressImage(file, {
    quality,
    mimeType: 'image/webp'
  })
}

/**
 * Get image dimensions
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        })
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Check if image file size is acceptable
 */
export function isImageSizeAcceptable(
  file: File,
  maxSizeInMB: number = 5
): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024
  return file.size <= maxSizeInBytes
}

/**
 * Validate image file
 */
export function validateImageFile(
  file: File,
  options: {
    maxSizeInMB?: number
    allowedTypes?: string[]
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxSizeInMB = 5,
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  } = options

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    }
  }

  // Check file size
  if (!isImageSizeAcceptable(file, maxSizeInMB)) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeInMB}MB limit`
    }
  }

  return { valid: true }
}

