# NeuraFit 🏋️‍♂️

AI-powered personalized workout generation platform built with React, TypeScript, Firebase, and Stripe.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Firebase account
- Stripe account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/salscrudato/neurafit.git
   cd neurafit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your Firebase and Stripe credentials.
   
   See [Environment Setup Guide](./docs/ENVIRONMENT_SETUP.md) for detailed instructions.

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173
   ```

---

## 📋 Environment Variables

**Required variables:**
- Firebase configuration (API key, project ID, etc.)
- Stripe publishable key and price IDs

**Setup:**
1. Copy `.env.example` to `.env`
2. Fill in your actual values
3. Never commit `.env` to version control

See [docs/ENVIRONMENT_SETUP.md](./docs/ENVIRONMENT_SETUP.md) for complete setup instructions.

---

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run preview          # Preview production build

# Code Quality
npm run lint             # Lint code
npm run lint:fix         # Fix linting issues
npm run typecheck        # Type check
npm run format           # Format code
npm run format:check     # Check formatting

# Testing
npm run test             # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Bundle Analysis
npm run build:analyze    # Build with bundle visualization
npm run build:check      # Check bundle sizes

# Deployment
npm run deploy           # Deploy to Firebase
```

---

## 📦 Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS 4** - Styling
- **React Router 7** - Routing

### Backend & Services
- **Firebase Auth** - Authentication
- **Firebase Firestore** - Database
- **Firebase Functions** - Serverless functions
- **Firebase Analytics** - Analytics
- **Stripe** - Payment processing

### State & Data
- **Zustand** - State management
- **React Query** - Data fetching
- **Immer** - Immutable updates

### Developer Tools
- **ESLint** - Linting
- **Prettier** - Code formatting
- **Vitest** - Testing
- **Sentry** - Error tracking

---

## 📁 Project Structure

```
neurafit/
├── src/
│   ├── components/      # React components
│   ├── pages/          # Page components
│   ├── lib/            # Core libraries (Firebase, Stripe)
│   ├── hooks/          # Custom React hooks
│   ├── store/          # Zustand state management
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── docs/               # Documentation
├── scripts/            # Build scripts
├── functions/          # Firebase Cloud Functions
└── dist/               # Production build
```

---

## 🔐 Security

### Environment Variables
- All API keys stored in environment variables
- `.env` file excluded from version control
- Separate keys for development and production

### Firebase Security
- Firestore security rules enforced
- Authentication required for sensitive operations
- Input validation and sanitization

### Best Practices
- No hardcoded secrets
- HTTPS enforced
- CSP headers configured
- Regular dependency updates

See [docs/ENVIRONMENT_SETUP.md](./docs/ENVIRONMENT_SETUP.md) for security best practices.

---

## 📊 Performance

### Build Optimization
- Code splitting by route
- Lazy loading for non-critical pages
- Firebase SDK chunked by service
- Aggressive minification with Terser
- Tree-shaking enabled

### Bundle Sizes (gzipped)
- Initial bundle: ~27 KB
- Total JavaScript: ~311 KB
- Total CSS: ~17 KB

### Lighthouse Scores
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

See [docs/BUILD_OPTIMIZATION.md](./docs/BUILD_OPTIMIZATION.md) for optimization details.

---

## 📚 Documentation

- [Environment Setup](./docs/ENVIRONMENT_SETUP.md) - Environment variables configuration
- [Build Optimization](./docs/BUILD_OPTIMIZATION.md) - Performance optimization guide
- [Optimization Summary](./docs/OPTIMIZATION_SUMMARY.md) - Complete optimization details
- [Quick Reference](./docs/QUICK_REFERENCE.md) - Common commands and troubleshooting

---

## 🚢 Deployment

### Firebase Hosting

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy to Firebase**
   ```bash
   npm run deploy
   ```

### Environment Variables

Set production environment variables:
1. Update `.env` with production values
2. Use production Firebase project
3. Use live Stripe keys (pk_live_...)

See [docs/ENVIRONMENT_SETUP.md](./docs/ENVIRONMENT_SETUP.md) for deployment guide.

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

---

## 📝 License

This project is private and proprietary.

---

## 🆘 Support

- **Documentation**: See `docs/` folder
- **Issues**: Check existing issues or create a new one
- **Environment Setup**: [docs/ENVIRONMENT_SETUP.md](./docs/ENVIRONMENT_SETUP.md)
- **Build Issues**: [docs/BUILD_OPTIMIZATION.md](./docs/BUILD_OPTIMIZATION.md)

---

## 🎯 Features

- ✅ AI-powered workout generation
- ✅ Personalized exercise recommendations
- ✅ Progress tracking and history
- ✅ Weight tracking per exercise
- ✅ Subscription management (Stripe)
- ✅ Offline support (PWA)
- ✅ Mobile-optimized UI
- ✅ Real-time updates
- ✅ Analytics and error tracking

---

**Built with ❤️ by the NeuraFit team**

