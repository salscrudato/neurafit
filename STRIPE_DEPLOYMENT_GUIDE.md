# NeuraFit Stripe Subscription Deployment Guide

## Overview
This guide covers the complete deployment of the NeuraFit Stripe subscription system, including Firebase Functions, webhook configuration, and testing procedures.

## Prerequisites
- Firebase CLI installed and authenticated
- Stripe account with test and live API keys
- Node.js 18+ installed

## 1. Stripe Configuration

### Create Products and Prices in Stripe Dashboard

1. **Log into Stripe Dashboard** (https://dashboard.stripe.com)

2. **Create Products:**
   - Go to Products → Add Product
   - Create "NeuraFit Pro Monthly" ($9.99/month)
   - Create "NeuraFit Pro Yearly" ($99.99/year)

3. **Note the Price IDs:**
   - Copy the price IDs (e.g., `price_1ABC123...`)
   - Update `src/lib/stripe-config.ts` with actual price IDs:
   ```typescript
   export const STRIPE_PRICE_IDS = {
     monthly: 'price_1ABC123...', // Replace with actual monthly price ID
     yearly: 'price_1DEF456...'   // Replace with actual yearly price ID
   }
   ```

## 2. Firebase Functions Configuration

### Set Firebase Secrets

```bash
# Set Stripe secret key
firebase functions:secrets:set STRIPE_SECRET_KEY

# Set Stripe webhook secret (will be generated after webhook creation)
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

### Deploy Functions

```bash
# Build and deploy functions
cd functions
npm run build
cd ..
firebase deploy --only functions
```

## 3. Stripe Webhook Configuration

### Create Webhook Endpoint

1. **Go to Stripe Dashboard → Webhooks**
2. **Add Endpoint:**
   - URL: `https://us-central1-neurafit-ai-2025.cloudfunctions.net/stripeWebhook`
   - Events to send:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

3. **Copy Webhook Secret:**
   - After creating, copy the webhook signing secret
   - Set it in Firebase: `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET`

### Redeploy Functions with Webhook Secret

```bash
firebase deploy --only functions
```

## 4. Frontend Deployment

### Update Environment Variables

Ensure the Stripe publishable key is correct in `src/lib/stripe-config.ts`:

```typescript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51RlpPwQjUU16Imh7NtysYpU3jWIYJI2tl13IGJlLunXASqRSIvawsKbzM090PHQ7IbdHGYxbcH5l31a7fIArCKz700uq9hyVBp'
```

### Deploy Frontend

```bash
npm run build
firebase deploy --only hosting
```

## 5. Firestore Security Rules

Deploy the updated security rules:

```bash
firebase deploy --only firestore:rules
```

## 6. Testing Procedures

### Test User Journey

1. **Create New Account:**
   - Sign up with new email
   - Complete onboarding

2. **Test Free Workouts:**
   - Generate 5 workouts
   - Verify counter decreases
   - Attempt 6th workout → should show upgrade prompt

3. **Test Subscription Flow:**
   - Click upgrade → should show subscription plans
   - Select plan → should show payment form
   - Use Stripe test card: `4242 4242 4242 4242`
   - Complete payment → should redirect to success page

4. **Test Subscription Features:**
   - Generate unlimited workouts
   - Check subscription status in profile
   - Test cancellation and reactivation

### Test Stripe Webhooks

1. **Use Stripe CLI for local testing:**
   ```bash
   stripe listen --forward-to https://us-central1-neurafit-ai-2025.cloudfunctions.net/stripeWebhook
   ```

2. **Trigger test events:**
   ```bash
   stripe trigger customer.subscription.created
   stripe trigger invoice.payment_succeeded
   ```

3. **Check Firebase Functions logs:**
   ```bash
   firebase functions:log
   ```

## 7. Production Deployment

### Switch to Live Keys

1. **Update Stripe keys to live keys:**
   ```bash
   firebase functions:secrets:set STRIPE_SECRET_KEY
   # Enter live secret key: sk_live_...
   ```

2. **Update frontend publishable key:**
   - Replace test key with live key in `src/lib/stripe-config.ts`

3. **Create live webhook endpoint:**
   - Same URL but in live mode
   - Update webhook secret: `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET`

4. **Deploy:**
   ```bash
   npm run build
   firebase deploy
   ```

## 8. Monitoring and Maintenance

### Key Metrics to Monitor

1. **Firebase Functions:**
   - Function execution count
   - Error rates
   - Execution duration

2. **Stripe Dashboard:**
   - Successful payments
   - Failed payments
   - Subscription churn

3. **Firestore:**
   - User subscription status
   - Workout generation counts

### Common Issues and Solutions

1. **Webhook signature verification fails:**
   - Verify webhook secret is correctly set
   - Check function logs for detailed error

2. **Payment form doesn't load:**
   - Verify Stripe publishable key
   - Check browser console for errors

3. **Subscription status not updating:**
   - Check webhook delivery in Stripe dashboard
   - Verify Firestore security rules allow updates

## 9. Security Considerations

1. **API Keys:**
   - Never commit API keys to version control
   - Use Firebase secrets for server-side keys
   - Rotate keys regularly

2. **Webhook Security:**
   - Always verify webhook signatures
   - Use HTTPS endpoints only

3. **Firestore Rules:**
   - Restrict subscription data access to authenticated users
   - Validate subscription data structure

## 10. Support and Troubleshooting

### Useful Commands

```bash
# View function logs
firebase functions:log

# Test functions locally
firebase emulators:start --only functions

# Check Firestore data
firebase firestore:get users/{userId}

# Stripe CLI commands
stripe customers list
stripe subscriptions list
stripe webhooks list
```

### Contact Information

For technical support or questions about this implementation, refer to:
- Firebase documentation: https://firebase.google.com/docs
- Stripe documentation: https://stripe.com/docs
- This implementation's GitHub repository

## Conclusion

This subscription system provides:
- ✅ 5 free workouts for new users
- ✅ Seamless upgrade flow with Stripe
- ✅ Real-time subscription status updates
- ✅ Subscription management (cancel/reactivate)
- ✅ Webhook-driven status synchronization
- ✅ Mobile-optimized payment forms
- ✅ Comprehensive error handling

The system is production-ready and follows Stripe and Firebase best practices for security, reliability, and user experience.
