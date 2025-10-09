# 🚀 Automated Deployment Setup Guide

This guide will help you set up automated deployments to Firebase using GitHub Actions.

## 📋 Prerequisites

- GitHub repository with admin access
- Firebase project (`neurafit-ai-2025`)
- Firebase CLI installed locally (`npm install -g firebase-tools`)

## 🔑 Step 1: Generate Firebase Service Account

### Option A: Using Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `neurafit-ai-2025`
3. Click the gear icon ⚙️ → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the JSON file securely (you'll need it in Step 2)

### Option B: Using Firebase CLI

```bash
# Login to Firebase
firebase login

# Generate service account
firebase init hosting:github

# Follow the prompts - this will automatically:
# 1. Create a service account
# 2. Add it to your GitHub repository secrets
# 3. Create the deployment workflow
```

## 🔐 Step 2: Add GitHub Secrets

Go to your GitHub repository:
**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### Required Secrets

Add the following secrets one by one:

#### 1. Firebase Service Account
- **Name:** `FIREBASE_SERVICE_ACCOUNT`
- **Value:** Paste the entire contents of the service account JSON file from Step 1
- **Format:**
  ```json
  {
    "type": "service_account",
    "project_id": "neurafit-ai-2025",
    "private_key_id": "...",
    "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
    "client_email": "...",
    "client_id": "...",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "..."
  }
  ```

#### 2. Firebase Configuration (from Firebase Console → Project Settings → General)
- **Name:** `VITE_FIREBASE_API_KEY`
- **Value:** Your Firebase API key (e.g., `AIzaSyC...`)

- **Name:** `VITE_FIREBASE_AUTH_DOMAIN`
- **Value:** `neurafit-ai-2025.firebaseapp.com`

- **Name:** `VITE_FIREBASE_PROJECT_ID`
- **Value:** `neurafit-ai-2025`

- **Name:** `VITE_FIREBASE_STORAGE_BUCKET`
- **Value:** `neurafit-ai-2025.firebasestorage.app`

- **Name:** `VITE_FIREBASE_MESSAGING_SENDER_ID`
- **Value:** Your messaging sender ID (e.g., `123456789`)

- **Name:** `VITE_FIREBASE_APP_ID`
- **Value:** Your app ID (e.g., `1:123456789:web:abc123`)

- **Name:** `VITE_FIREBASE_MEASUREMENT_ID`
- **Value:** Your measurement ID (e.g., `G-XXXXXXXXXX`)

#### 3. Optional Secrets
- **Name:** `VITE_SENTRY_DSN`
- **Value:** Your Sentry DSN (if using Sentry for error tracking)

- **Name:** `VITE_WORKOUT_FN_URL`
- **Value:** Your Cloud Function URL for workout generation

## ✅ Step 3: Verify Secrets

After adding all secrets, verify they're set correctly:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. You should see all the secrets listed (values are hidden)
3. Count: You should have **9 secrets** minimum (1 service account + 7 Firebase config + 1 GitHub token auto-provided)

## 🧪 Step 4: Test the Deployment

### Automatic Deployment (on push to main)

```bash
# Make a small change
echo "# Test deployment" >> README.md

# Commit and push to main
git add README.md
git commit -m "test: trigger automated deployment"
git push origin main
```

### Manual Deployment (workflow_dispatch)

1. Go to **Actions** tab in GitHub
2. Click **Deploy to Firebase** workflow
3. Click **Run workflow** button
4. Select deployment target:
   - `hosting` - Deploy web app only (default)
   - `functions` - Deploy Cloud Functions only
   - `hosting,functions` - Deploy both
5. Click **Run workflow**

## 📊 Step 5: Monitor Deployment

1. Go to **Actions** tab in GitHub
2. Click on the running workflow
3. Watch the deployment progress in real-time
4. Check the deployment summary at the bottom

### Expected Output

```
✅ Deployment completed successfully!

🌐 Your app is now live at:
   • https://neurafit-ai-2025.web.app
   • https://neurafit-ai-2025.firebaseapp.com
   • https://neurastack.ai

📊 Deployment details:
   • Branch: main
   • Commit: abc123...
   • Triggered by: salscrudato
```

## 🔧 Troubleshooting

### Error: "Missing required environment variables"

**Solution:** Make sure all Firebase secrets are added to GitHub:
- Go to **Settings** → **Secrets and variables** → **Actions**
- Verify all `VITE_FIREBASE_*` secrets are present
- Check for typos in secret names (they're case-sensitive)

### Error: "Permission denied" or "403 Forbidden"

**Solution:** Service account needs proper permissions:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: `neurafit-ai-2025`
3. Go to **IAM & Admin** → **IAM**
4. Find your service account email
5. Add these roles:
   - **Firebase Admin**
   - **Cloud Functions Admin** (if deploying functions)
   - **Service Account User**

### Error: "Build failed"

**Solution:** Check the build logs:
1. Click on the failed workflow run
2. Expand the "Build application" step
3. Look for TypeScript errors or missing dependencies
4. Fix locally and push again

### Error: "Firebase CLI not found"

**Solution:** This shouldn't happen with the workflow, but if it does:
- The workflow uses `FirebaseExtended/action-hosting-deploy@v0`
- This action includes Firebase CLI automatically
- Check if the action version is up to date

## 🎯 Best Practices

### 1. Use Environments

Create a GitHub environment for production:
1. Go to **Settings** → **Environments**
2. Click **New environment**
3. Name it `production`
4. Add protection rules:
   - ✅ Required reviewers (optional)
   - ✅ Wait timer (optional)
   - ✅ Deployment branches: `main` only

### 2. Version Tagging

Tag releases for better tracking:
```bash
# After successful deployment
git tag -a v1.0.5 -m "Release v1.0.5"
git push origin v1.0.5
```

### 3. Deployment Notifications

Set up Slack/Discord notifications:
- Add a notification step to the workflow
- Use GitHub Actions marketplace integrations

### 4. Rollback Strategy

If deployment fails in production:
```bash
# Option 1: Rollback via Firebase Console
# Go to Hosting → Release history → Rollback

# Option 2: Rollback via CLI
firebase hosting:rollback

# Option 3: Redeploy previous commit
git revert HEAD
git push origin main  # Triggers auto-deployment
```

## 📚 Additional Resources

- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

## 🆘 Need Help?

If you encounter issues:
1. Check the [GitHub Actions logs](https://github.com/salscrudato/neurafit/actions)
2. Review [Firebase Console](https://console.firebase.google.com/)
3. Check [Firebase Status](https://status.firebase.google.com/)
4. Review this guide again carefully

## ✅ Checklist

Before going live, ensure:
- [ ] All GitHub secrets are configured
- [ ] Service account has proper permissions
- [ ] Test deployment succeeded
- [ ] Both URLs are accessible (neurastack.ai + Firebase URL)
- [ ] Service worker is working
- [ ] No console errors on production
- [ ] Analytics is tracking properly
- [ ] Sentry is receiving events (if configured)

