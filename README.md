# NeuraFit 🏋️‍♂️

AI-powered personalized workout generator that creates custom fitness plans tailored to your goals, experience level, and available equipment.

## 🌐 Live Application

- **Production:** https://neurastack.ai
- **Firebase:** https://neurafit-ai-2025.web.app

## ✨ Features

- 🤖 **AI-Powered Workouts** - Dynamic workout generation using OpenAI GPT-4o-mini-2024-07-18
- 🎯 **Personalized Plans** - Tailored to your fitness level, goals, equipment, and workout history
- 📊 **Progress Tracking** - Monitor your workout history and improvements
- 💪 **Adaptive Difficulty** - Automatically adjusts based on your feedback and performance (±15% intensity scaling)
- 🧠 **Workout History Integration** - AI learns from your past 5 workouts for better personalization
- 🩹 **Injury Awareness** - Respects injuries and modifies exercises accordingly
- ⚡ **Fast Generation** - Average 22s response time with streaming support
- 📱 **Mobile-First Design** - Optimized for mobile devices with PWA support
- 🔄 **Offline Support** - Service worker caching for offline access
- 🔐 **Secure Authentication** - Google Sign-In and phone authentication
- 💳 **Subscription Management** - Stripe integration for premium features

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Firebase CLI

### Installation

```bash
# Clone the repository
git clone https://github.com/salscrudato/neurafit.git
cd neurafit

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Firebase and Stripe credentials

# Start development server
npm run dev
```

### Development

```bash
npm run dev              # Start dev server (localhost:5173)
npm run dev:host         # Start dev server with network access
npm run build            # Build for production
npm run typecheck        # Run TypeScript type checking
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
```

## 📦 Deployment

### 🚀 Automated Deployment (Recommended)

**Deployments are automated via GitHub Actions!** Simply push to `main`:

```bash
# Make your changes
git add .
git commit -m "feat: add new feature"
git push origin main

# GitHub Actions will automatically:
# ✅ Run tests and linting
# ✅ Build the application
# ✅ Deploy to Firebase
# ✅ Update both neurastack.ai and neurafit-ai-2025.web.app
```

**Setup automated deployment:** See [.github/DEPLOYMENT_SETUP.md](./.github/DEPLOYMENT_SETUP.md)

### 🛠️ Manual Deployment

```bash
# Verify deployment setup
npm run deploy:verify

# Deploy manually
npm run deploy           # Deploy hosting only
npm run deploy:all       # Deploy hosting + functions
npm run deploy:functions # Deploy functions only
```

### 📝 Version Management

```bash
npm run version:patch    # Bump patch version (1.0.0 → 1.0.1)
npm run version:minor    # Bump minor version (1.0.0 → 1.1.0)
npm run version:major    # Bump major version (1.0.0 → 2.0.0)
npm run clean:cache      # Clear all build caches
```

## 🏗️ Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Router** - Client-side routing

### Backend
- **Firebase Authentication** - User authentication
- **Firebase Firestore** - Database
- **Firebase Cloud Functions** - Serverless backend
- **Firebase Hosting** - Static hosting
- **Stripe** - Payment processing

### AI/ML
- **OpenAI GPT** - Workout generation
- **Custom prompts** - Personalization logic

### DevOps
- **GitHub Actions** - CI/CD (planned)
- **Firebase CLI** - Deployment
- **Sentry** - Error monitoring

## 📁 Project Structure

```
neurafit/
├── src/
│   ├── ui/              # Design system - Reusable UI primitives
│   │   ├── Button.tsx   # Button component with variants
│   │   ├── Card.tsx     # Card component with variants
│   │   ├── index.ts     # Centralized exports
│   │   └── README.md    # Component documentation
│   ├── components/      # Feature-specific components
│   │   ├── AppHeader.tsx
│   │   ├── WorkoutProgress.tsx
│   │   └── ui/          # Backward compatibility re-exports
│   ├── pages/           # Route pages
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and helpers
│   ├── store/           # Zustand state management
│   ├── constants/       # Centralized constants
│   ├── types/           # TypeScript type definitions
│   └── main.tsx         # Application entry point
├── functions/           # Firebase Cloud Functions
├── public/              # Static assets
├── scripts/             # Build and deployment scripts
├── .github/             # GitHub configuration
├── firebase.json        # Firebase configuration
├── vite.config.ts       # Vite configuration
└── tailwind.config.js   # Tailwind CSS configuration
```

### Component Organization

- **`src/ui/`** - Reusable UI primitives (design system)
  - Low-level building blocks
  - No business logic
  - Highly reusable across the app
  - Examples: Button, Card, Input, Modal

- **`src/components/`** - Feature-specific components
  - Page-specific or feature-specific
  - May contain business logic
  - Composed of UI primitives
  - Examples: AppHeader, WorkoutProgress, SmartWeightInput

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Cloud Functions URLs
VITE_WORKOUT_FN_URL=https://us-central1-your-project.cloudfunctions.net/generateWorkout
VITE_ADD_EXERCISE_FN_URL=https://us-central1-your-project.cloudfunctions.net/addExerciseToWorkout
VITE_SWAP_EXERCISE_FN_URL=https://us-central1-your-project.cloudfunctions.net/swapExercise

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key

# Sentry (Optional)
VITE_SENTRY_DSN=your_sentry_dsn
```

### Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Google and Phone providers)
3. Create a Firestore database
4. Deploy Cloud Functions
5. Set up Firebase Hosting

## 🧪 Testing

```bash
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
```

## 📊 Bundle Analysis

```bash
npm run build:analyze    # Build and open bundle analyzer
npm run build:check      # Check bundle sizes
```

## 🐛 Troubleshooting

### Build Issues

```bash
# Clear all caches and rebuild
npm run clean:cache
npm run build
```

### Deployment Issues

```bash
# Check Firebase login
firebase login

# Check current project
firebase projects:list

# Rollback deployment
firebase hosting:rollback
```

### Environment Variable Issues

Remember: Environment variables are baked into the build at build time. After changing `.env`:

```bash
npm run clean:cache
npm run build
```

## 📝 License

This project is private and proprietary.

## 👤 Author

**Sal Scrudato**
- GitHub: [@salscrudato](https://github.com/salscrudato)
- Email: sal.scrudato@gmail.com

## 🙏 Acknowledgments

- OpenAI for GPT API
- Firebase for backend infrastructure
- Stripe for payment processing
- All open-source contributors

---

**Built with ❤️ using React, TypeScript, and Firebase**

