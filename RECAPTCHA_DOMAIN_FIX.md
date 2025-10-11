# reCAPTCHA Domain Authorization Fix

## Problem
Phone authentication is failing with a **401 Unauthorized** error when trying to use reCAPTCHA on `neurastack.ai`:

```
POST https://www.google.com/recaptcha/api2/pat?k=6LcMZR0UAAAAALgPMcgHwga7gY5p8QMg1Hj-bmUv 401 (Unauthorized)
```

## Root Cause
The reCAPTCHA site key `6LcMZR0UAAAAALgPMcgHwga7gY5p8QMg1Hj-bmUv` is **not authorized** for the domain `neurastack.ai`. It's likely only configured for:
- `localhost`
- `neurafit-ai-2025.web.app`
- `neurafit-ai-2025.firebaseapp.com`

## Solution: Add neurastack.ai to Authorized Domains

### Step 1: Access Google reCAPTCHA Admin Console
1. Go to https://www.google.com/recaptcha/admin
2. Sign in with the Google account that owns the reCAPTCHA key
3. Find the site with key `6LcMZR0UAAAAALgPMcgHwga7gY5p8QMg1Hj-bmUv`

### Step 2: Add neurastack.ai to Authorized Domains
1. Click on the site/key in the reCAPTCHA admin console
2. Scroll to the **Domains** section
3. Click **Add a domain**
4. Enter: `neurastack.ai`
5. Click **Save**

### Step 3: Verify Configuration
After adding the domain, the authorized domains should include:
- `localhost` (for local development)
- `neurafit-ai-2025.web.app` (Firebase Hosting)
- `neurafit-ai-2025.firebaseapp.com` (Firebase Hosting)
- `neurastack.ai` (Custom domain) ← **NEW**

### Step 4: Test Phone Authentication
1. Wait 1-2 minutes for the changes to propagate
2. Go to https://neurastack.ai/auth
3. Click "Sign in with Phone"
4. Enter a phone number
5. Verify that reCAPTCHA loads without 401 errors

## Alternative: Create a New reCAPTCHA Key

If you don't have access to the existing reCAPTCHA admin console, you can create a new key:

### Step 1: Create New reCAPTCHA v2 Invisible Key
1. Go to https://www.google.com/recaptcha/admin/create
2. Choose **reCAPTCHA v2** → **Invisible reCAPTCHA badge**
3. Add domains:
   - `localhost`
   - `neurafit-ai-2025.web.app`
   - `neurafit-ai-2025.firebaseapp.com`
   - `neurastack.ai`
4. Accept the terms and click **Submit**
5. Copy the **Site Key**

### Step 2: Update Firebase Console
1. Go to https://console.firebase.google.com/project/neurafit-ai-2025/authentication/providers
2. Click on **Phone** provider
3. Scroll to **reCAPTCHA** section
4. Update the **reCAPTCHA site key** with your new key
5. Click **Save**

### Step 3: Test
The new key should work immediately on all configured domains.

## Expected Behavior After Fix

### Before Fix (Current State)
```
❌ POST https://www.google.com/recaptcha/api2/pat?k=... 401 (Unauthorized)
❌ POST https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode 400 (Bad Request)
❌ Phone authentication fails
```

### After Fix
```
✅ reCAPTCHA loads successfully
✅ Phone verification code sent
✅ User can sign in with phone number
```

## Additional Fixes Deployed

The following issues have already been fixed and deployed:

1. ✅ **Permissions Policy Warning** - Added `private-token=()` to suppress "Unrecognized feature" warning
2. ✅ **Service Worker Preload** - Disabled navigationPreload (will be fixed after next build)
3. ✅ **CSP for Google APIs** - Added `https://apis.google.com` to connect-src

## Next Steps

1. **Add `neurastack.ai` to reCAPTCHA authorized domains** (see Step 2 above)
2. **Deploy the latest changes** (run `npm run deploy` to apply Permissions Policy fix)
3. **Test phone authentication** on https://neurastack.ai

## Questions?

If you need help accessing the reCAPTCHA admin console or have questions about the setup, let me know!

