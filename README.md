# NeuraFit - AI-Powered Workout Generator

> Transform your fitness journey with personalized AI-powered workout plans tailored to your goals, experience level, and available equipment.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1-61dafb.svg)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12.3-orange.svg)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/license-Private-red.svg)]()

## 🚀 Features

- **AI-Powered Workouts**: Generate personalized workout plans in 30 seconds
- **Smart Customization**: Tailored to your fitness goals, experience level, and available equipment
- **Progress Tracking**: Track your workout history and monitor your fitness journey
- **Adaptive Difficulty**: AI adjusts workout intensity based on your feedback
- **Equipment Flexibility**: Works with any equipment or bodyweight only
- **Mobile-First PWA**: Install on any device for app-like experience
- **Offline Support**: Access your workouts even without internet connection

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern UI library with latest features
- **TypeScript 5.8** - Type-safe development
- **Vite 7** - Lightning-fast build tool
- **Tailwind CSS 4** - Utility-first styling
- **Zustand** - Lightweight state management
- **React Router 7** - Client-side routing
- **React Query** - Server state management

### Backend & Services
- **Firebase Auth** - User authentication (Google, Phone)
- **Cloud Firestore** - Real-time database
- **Cloud Functions** - Serverless backend
- **OpenAI API** - AI workout generation
- **Stripe** - Payment processing
- **Sentry** - Error monitoring

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Vitest** - Unit testing
- **Testing Library** - Component testing
- **Workbox** - Service worker management

## 📋 Prerequisites

- **Node.js**: >= 20.0.0
- **npm**: >= 10.0.0
- **Firebase CLI**: `npm install -g firebase-tools`

## 🏁 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/salscrudato/neurafit.git
cd neurafit
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key

# Sentry Configuration (optional)
VITE_SENTRY_DSN=your_sentry_dsn
```

### 4. Start development server

```bash
npm run dev
```

Visit `http://localhost:5173` to see the app.

## 📜 Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run dev:host` - Start dev server with network access
- `npm run dev:https` - Start dev server with HTTPS

### Building
- `npm run build` - Build for production
- `npm run build:analyze` - Build with bundle analysis
- `npm run build:check` - Check bundle size

### Code Quality
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Lint code with ESLint
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Testing
- `npm test` - Run tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Open Vitest UI
- `npm run test:coverage` - Generate coverage report

### Deployment
- `npm run deploy` - Deploy to Firebase Hosting
- `npm run deploy:full` - Deploy hosting + functions + rules
- `npm run deploy:functions` - Deploy Cloud Functions only
- `npm run deploy:rules` - Deploy Firestore rules only

### Maintenance
- `npm run clean` - Clean build artifacts
- `npm run clean:all` - Clean everything including node_modules
- `npm run reinstall` - Clean and reinstall dependencies

## 🏗️ Project Structure

```
neurafit/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/           # Page components
│   ├── design-system/   # Design system components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Third-party integrations
│   ├── providers/       # Context providers
│   ├── routes/          # Route definitions
│   ├── store/           # Zustand state management
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── config/          # App configuration
├── functions/           # Firebase Cloud Functions
├── public/              # Static assets
├── scripts/             # Build scripts
└── dist/                # Production build output
```

## 🔒 Security

- **Firestore Rules**: Comprehensive security rules for data access
- **Content Security Policy**: Strict CSP headers configured
- **HTTPS Only**: Enforced via HSTS headers
- **Authentication**: Secure Firebase Auth integration
- **Input Validation**: Zod schemas for all user inputs

## 🚢 Deployment

### Firebase Hosting

```bash
# Build and deploy
npm run deploy

# Deploy with version bump
npm run version:patch  # 1.0.0 -> 1.0.1
npm run version:minor  # 1.0.0 -> 1.1.0
npm run version:major  # 1.0.0 -> 2.0.0
```

### Environment Setup

1. **Development**: `http://localhost:5173`
2. **Production**: `https://neurafit-ai-2025.web.app`

## 📊 Performance

- **Lighthouse Score**: 95+ across all metrics
- **Bundle Size**: < 300KB gzipped
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

## 📝 License

Private - All rights reserved

## 👥 Team

- **Developer**: Sal Scrudato
- **Email**: sal.scrudato@gmail.com

## 🔗 Links

- **Production**: https://neurafit-ai-2025.web.app
- **Firebase Console**: https://console.firebase.google.com/project/neurafit-ai-2025
- **Repository**: https://github.com/salscrudato/neurafit

---

Built with ❤️ using React, TypeScript, and Firebase

