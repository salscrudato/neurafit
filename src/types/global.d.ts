// Global type declarations for build-time constants and functions

declare global {
  // Build-time constants injected by Vite
  const __APP_VERSION__: string
  const __BUILD_TIME__: string
  
  // Global functions for update management
  interface Window {
    applyUpdate: () => void
  }
}

export {}
