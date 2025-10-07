# Firebase Deployment Guide

## 🚀 Quick Deploy

Run these commands to deploy everything:

```bash
# 1. Build the frontend
npm run build

# 2. Deploy functions and hosting
firebase deploy
```

---

## 📋 Pre-Deployment Checklist

Before deploying, make sure:

- [ ] Phone authentication is enabled in Firebase Console
- [ ] Test phone numbers are added (for testing in production)
- [ ] All environment variables are set
- [ ] Code is tested locally
- [ ] No console errors (except reCAPTCHA warnings)
- [ ] All changes are committed to git

---

## 🔧 Step-by-Step Deployment

### Step 1: Build Frontend

```bash
# Clean previous build
rm -rf dist

# Build for production
npm run build
```

**Expected output:**
```
✓ built in XXXms
dist/index.html                   X.XX kB
dist/assets/index-XXXXX.js        XXX.XX kB
```

### Step 2: Deploy Functions (Backend)

```bash
# Deploy only functions
firebase deploy --only functions
```

**This will deploy:**
- ✅ Workout generation function (with 50 free workouts)
- ✅ Stripe payment functions
- ✅ Subscription management
- ✅ Webhook handlers

**Expected output:**
```
✔  functions: Finished running predeploy script.
✔  functions[generateWorkout(us-central1)]: Successful update operation.
✔  functions[createPaymentIntent(us-central1)]: Successful update operation.
...
✔  Deploy complete!
```

### Step 3: Deploy Hosting (Frontend)

```bash
# Deploy only hosting
firebase deploy --only hosting
```

**This will deploy:**
- ✅ React app with phone authentication
- ✅ Updated UI components
- ✅ Phone auth modal
- ✅ Updated CSP headers

**Expected output:**
```
✔  hosting: Finished running predeploy script.
✔  hosting: 123 files uploaded successfully
✔  Deploy complete!

Hosting URL: https://your-project.web.app
```

### Step 4: Deploy Everything at Once

```bash
# Deploy functions + hosting together
firebase deploy
```

---

## 🧪 Post-Deployment Testing

After deployment, test these features:

### 1. Test Phone Authentication
1. Go to your production URL
2. Click "Continue with Phone"
3. Enter test number: `(555) 123-4567`
4. Enter code: `123456`
5. Verify you're signed in ✅

### 2. Test New User Signup
1. Sign out
2. Create new account (any method)
3. Go to Profile page
4. Verify shows "50 of 50" free workouts ✅

### 3. Test Workout Generation
1. Generate a workout
2. Verify it works
3. Check Profile shows "49 of 50" ✅

### 4. Test Existing Features
- [ ] Google sign-in works
- [ ] Email sign-in works
- [ ] Workout generation works
- [ ] Subscription flow works
- [ ] Profile page loads

---

## 🔍 Monitoring Deployment

### Check Deployment Status

```bash
# View recent deployments
firebase hosting:channel:list

# View function logs
firebase functions:log
```

### Monitor in Firebase Console

1. **Functions:** Console → Functions → See all functions running
2. **Hosting:** Console → Hosting → See deployment history
3. **Authentication:** Console → Authentication → See new signups
4. **Usage:** Console → Usage → Monitor SMS sends

---

## 🐛 Troubleshooting Deployment

### Build Fails

```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Functions Deployment Fails

```bash
# Check functions directory
cd functions
npm install
npm run build
cd ..

# Deploy with verbose logging
firebase deploy --only functions --debug
```

### Hosting Deployment Fails

```bash
# Check firebase.json configuration
cat firebase.json

# Verify dist folder exists
ls -la dist/

# Deploy with verbose logging
firebase deploy --only hosting --debug
```

### "Permission Denied" Error

```bash
# Re-authenticate
firebase login --reauth

# Check project
firebase projects:list
firebase use your-project-id
```

---

## 🔐 Security Checklist

After deployment, verify:

- [ ] CSP headers are active (check browser console)
- [ ] HTTPS is enforced
- [ ] Phone auth requires test numbers or valid SMS
- [ ] API keys are not exposed in client code
- [ ] Firestore rules are properly configured
- [ ] Functions are protected with authentication

---

## 💰 Cost Monitoring

After deploying phone auth, monitor costs:

### SMS Costs
- **US/Canada:** ~$0.01 per SMS
- **Other countries:** ~$0.02-0.10 per SMS

### Set Up Billing Alerts
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **Billing** → **Budgets & alerts**
4. Create a budget alert (e.g., $10/month)

### Monitor Usage
1. Firebase Console → **Authentication** → **Usage**
2. Check SMS sends per day/month
3. Set up alerts for unusual activity

---

## 🔄 Rollback Plan

If something goes wrong:

### Rollback Hosting

```bash
# List previous deployments
firebase hosting:channel:list

# Rollback to previous version
firebase hosting:rollback
```

### Rollback Functions

```bash
# Functions don't have automatic rollback
# You'll need to redeploy the previous version
git checkout <previous-commit>
firebase deploy --only functions
git checkout main
```

---

## 📊 Deployment Checklist

### Before Deployment
- [ ] Code tested locally
- [ ] All tests passing
- [ ] Environment variables set
- [ ] Firebase project selected
- [ ] Logged into Firebase CLI

### During Deployment
- [ ] Build completes successfully
- [ ] Functions deploy without errors
- [ ] Hosting deploys without errors
- [ ] No deployment warnings

### After Deployment
- [ ] Production site loads
- [ ] Phone auth works
- [ ] New users get 50 free workouts
- [ ] Existing features work
- [ ] No console errors (except reCAPTCHA)
- [ ] SSL certificate active
- [ ] Analytics tracking works

---

## 🎯 Quick Commands Reference

```bash
# Full deployment
npm run build && firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy only hosting
firebase deploy --only hosting

# Deploy specific function
firebase deploy --only functions:generateWorkout

# View logs
firebase functions:log

# Check deployment status
firebase hosting:channel:list

# Rollback hosting
firebase hosting:rollback
```

---

## 📱 Production URLs

After deployment, your app will be available at:

- **Primary:** `https://your-project.web.app`
- **Custom domain:** `https://neurastack.ai` (if configured)

---

## 🆘 Need Help?

### Common Issues

**Issue:** Build fails with TypeScript errors
**Solution:** Run `npm run type-check` to see errors, fix them, then rebuild

**Issue:** Functions timeout
**Solution:** Increase timeout in `functions/src/index.ts` or check function logs

**Issue:** Phone auth not working in production
**Solution:** 
1. Check Firebase Console → Authentication → Phone is enabled
2. Add production domain to authorized domains
3. For testing, use test phone numbers

**Issue:** 404 errors on routes
**Solution:** Check `firebase.json` has correct rewrites configuration

---

## ✅ Success Criteria

Deployment is successful when:

1. ✅ Production site loads at your URL
2. ✅ Phone authentication works
3. ✅ New users get 50 free workouts
4. ✅ Workout generation works
5. ✅ All existing features work
6. ✅ No critical console errors
7. ✅ SSL certificate is active
8. ✅ Functions are responding

---

**Ready to deploy!** 🚀

Run: `npm run build && firebase deploy`

