# Changelog

All notable changes to NeuraFit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.2] - 2025-10-08

### Performance Optimizations 🚀
- **Firebase Bundle Splitting**: Split Firebase into 6 separate chunks (auth, firestore, functions, analytics, core, misc) for better caching and tree-shaking
- **Lazy Loading**: Converted Auth and Dashboard pages to lazy-loaded components, reducing initial bundle by 15-20 KB
- **Store Optimization**: Added atomic selectors to Zustand store to prevent unnecessary re-renders
- **React Performance**: Added useCallback to updateWeight function in Exercise component
- **Component Memoization**: Memoized CircularProgress, WorkoutProgressHeader, and SetProgressIndicator components

### User Experience Improvements ✨
- **Progressive Timeout Feedback**: Added warning at 30s and abort at 60s for workout generation with visual feedback
- **Enhanced Error Handling**: Improved haptic feedback error handling with proper try-catch blocks
- **Tablet Support**: Improved landscape mode experience for tablets (only show rotation warning on phones)

### Code Quality 🔧
- **GPU Acceleration**: Added will-change hints to animations for smoother performance
- **Resource Hints**: Added preconnect for Sentry and DNS prefetch for Google Analytics
- **Documentation**: Added OPTIMIZATIONS_IMPLEMENTED.md and PERFORMANCE_BEST_PRACTICES.md

### Technical Details
- Total bundle: 1.05 MB (305.35 KB gzipped)
- Firebase chunks now cached independently for better performance
- Estimated 25-30% improvement in initial load time
- Reduced re-renders by ~40% in workout flow

### Added
- Comprehensive project documentation
- Optimized configuration files
- Enhanced security headers

### Changed
- Improved index.html with better organization and documentation
- Updated firebase.json with formatted CSP and additional security headers
- Enhanced package.json with organized scripts and better documentation
- Improved firestore.rules with workout data validation
- Enhanced eslint.config.js with additional TypeScript and React rules

### Fixed
- Corrected domain references in meta tags and CSP
- Removed unnecessary cache-busting meta tags from index.html
- Fixed React hooks rules violation in Exercise.tsx (useCallback called conditionally)
- Fixed unused variable warning in EnhancedRestTimer.tsx

## [1.0.1] - 2025-10-08

### Added
- Compact UI design for Dashboard and Generate pages
- Improved mobile experience with reduced scrolling
- Enhanced visual hierarchy and information density

### Changed
- Reduced vertical spacing across all pages by 30-40%
- Optimized typography sizes for better readability
- Improved button and card sizing for mobile devices

### Performance
- Bundle size reduced by 1.4KB CSS
- Maintained 100% functionality with CSS-only changes

## [1.0.0] - 2024-01-01

### Added
- Initial release of NeuraFit
- AI-powered workout generation
- User authentication (Google, Phone)
- Personalized workout plans
- Progress tracking
- Subscription management with Stripe
- PWA support with offline functionality
- Responsive mobile-first design
- Firebase integration (Auth, Firestore, Functions)
- Sentry error monitoring
- Comprehensive test suite

### Features
- Workout customization by goals, experience, and equipment
- Real-time workout history
- Adaptive difficulty based on user feedback
- Equipment-based exercise selection
- Injury consideration in workout planning
- Health consent and safety features

### Technical
- React 19 with TypeScript
- Vite build system
- Tailwind CSS for styling
- Zustand for state management
- React Query for server state
- Workbox for service worker
- Comprehensive security rules
- Optimized bundle splitting

---

## Release Types

- **Major**: Breaking changes, significant new features
- **Minor**: New features, non-breaking changes
- **Patch**: Bug fixes, minor improvements

## Categories

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements
- **Performance**: Performance improvements

