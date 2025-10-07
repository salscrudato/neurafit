# Phone Authentication Setup Guide

## Current Error: `auth/invalid-app-credential`

This error occurs because **Phone Authentication is not enabled** in your Firebase project. Follow these steps to fix it:

---

## 🔧 Step 1: Enable Phone Authentication in Firebase Console

### 1.1 Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **neurafit**

### 1.2 Enable Phone Sign-In Method
1. In the left sidebar, click **Authentication**
2. Click the **Sign-in method** tab
3. Find **Phone** in the list of providers
4. Click on **Phone** to expand it
5. Toggle the **Enable** switch to ON
6. Click **Save**

### 1.3 Add Authorized Domains
While in the Sign-in method tab:
1. Scroll down to **Authorized domains**
2. Make sure these domains are listed:
   - `localhost` (for local development)
   - Your production domain (e.g., `neurastack.ai`)
3. If `localhost` is not there, click **Add domain** and add it

---

## 🧪 Step 2: Set Up Test Phone Numbers (For Development)

To test phone authentication without sending real SMS messages:

### 2.1 Add Test Phone Numbers
1. In Firebase Console → **Authentication** → **Sign-in method**
2. Scroll down to **Phone numbers for testing**
3. Click **Add phone number**
4. Add test numbers with verification codes:
   ```
   Phone Number: +1 555 123 4567
   Verification Code: 123456
   ```
   ```
   Phone Number: +1 555 987 6543
   Verification Code: 654321
   ```
5. Click **Add**

### 2.2 Test with These Numbers
- When testing locally, use these test numbers
- They won't send real SMS messages
- Use the verification codes you set up

---

## 🚀 Step 3: Deploy and Test

### 3.1 Restart Your Dev Server
After enabling phone auth in Firebase:
```bash
# Stop your dev server (Ctrl+C)
# Start it again
npm run dev
```

### 3.2 Test the Flow
1. Open your app at `http://localhost:5173`
2. Click **"Continue with Phone"**
3. Enter a test phone number: `(555) 123-4567`
4. The app will automatically add `+1` prefix
5. Click **"Send Verification Code"**
6. Enter the test code: `123456`
7. Click **"Verify & Sign In"**
8. You should be signed in! ✅

---

## 📱 Step 4: Production Setup

### 4.1 Enable Real SMS Sending
For production, you need to:

1. **Verify your Firebase project** (if not already done)
2. **Set up billing** in Google Cloud Console (required for SMS)
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your Firebase project
   - Enable billing
   - SMS messages cost approximately $0.01-0.02 per message

### 4.2 Monitor SMS Usage
1. Go to Firebase Console → **Authentication** → **Usage**
2. Monitor your SMS sends to avoid unexpected costs
3. Set up budget alerts in Google Cloud Console

### 4.3 Rate Limiting
Firebase automatically rate limits SMS sends to prevent abuse:
- **10 SMS per phone number per day** (default)
- **100 SMS per IP address per day** (default)

---

## 🔍 Troubleshooting

### Error: "auth/invalid-app-credential"
**Solution:** Phone authentication is not enabled. Follow Step 1 above.

### Error: "auth/quota-exceeded"
**Solution:** You've exceeded the SMS quota. Wait 24 hours or upgrade your plan.

### Error: "auth/too-many-requests"
**Solution:** Too many attempts from this device/IP. Wait a few minutes and try again.

### reCAPTCHA Not Loading
**Solution:** 
1. Check that CSP headers allow reCAPTCHA domains (already configured in `firebase.json`)
2. Make sure you're not blocking third-party cookies
3. Try in an incognito window

### Phone Number Format Issues
**Solution:**
- The app automatically adds `+1` for US numbers
- Users should enter 10 digits: `(555) 123-4567`
- The app formats it as: `+15551234567` for Firebase

---

## 📊 How It Works

### User Flow:
1. User enters phone number (10 digits)
2. App adds `+1` prefix automatically
3. Firebase sends SMS with 6-digit code
4. User enters code
5. Firebase verifies code
6. User is signed in
7. New users get 50 free workouts

### Technical Flow:
```
User Input: (555) 123-4567
    ↓
Cleaned: 5551234567
    ↓
Formatted: +15551234567
    ↓
Firebase SMS → User's Phone
    ↓
User Enters Code: 123456
    ↓
Firebase Verifies
    ↓
User Authenticated ✅
```

---

## 💰 Cost Estimates

### SMS Pricing (approximate):
- **US/Canada:** $0.01 per SMS
- **Other countries:** $0.02-0.10 per SMS

### Example Monthly Costs:
- **100 new users/month:** ~$1.00
- **500 new users/month:** ~$5.00
- **1,000 new users/month:** ~$10.00

**Note:** These are one-time costs per user signup. Returning users don't need SMS.

---

## 🔐 Security Best Practices

### Already Implemented:
✅ Invisible reCAPTCHA (prevents bots)
✅ Firebase rate limiting (prevents abuse)
✅ Phone number validation (US format only)
✅ Code expiration (codes expire after a few minutes)
✅ CSP headers (restricts allowed domains)

### Additional Recommendations:
- Monitor authentication logs in Firebase Console
- Set up alerts for unusual activity
- Consider adding phone number verification for existing accounts
- Implement account recovery via phone

---

## 📝 Testing Checklist

Before deploying to production:

- [ ] Phone authentication enabled in Firebase Console
- [ ] Test phone numbers configured
- [ ] Tested with test phone numbers locally
- [ ] Verified reCAPTCHA loads correctly
- [ ] Tested error handling (invalid code, expired code)
- [ ] Verified new users get 50 free workouts
- [ ] Tested on mobile devices
- [ ] Verified SMS costs and billing setup
- [ ] Set up usage monitoring and alerts
- [ ] Tested in production environment

---

## 🆘 Need Help?

### Firebase Documentation:
- [Phone Authentication Guide](https://firebase.google.com/docs/auth/web/phone-auth)
- [Test Phone Numbers](https://firebase.google.com/docs/auth/web/phone-auth#test-with-whitelisted-phone-numbers)
- [reCAPTCHA Setup](https://firebase.google.com/docs/auth/web/phone-auth#use-invisible-recaptcha)

### Common Issues:
1. **"Phone auth not working"** → Check Firebase Console settings
2. **"SMS not received"** → Check test phone numbers or billing
3. **"reCAPTCHA errors"** → Check CSP headers and browser console

---

## ✅ Quick Start (TL;DR)

1. **Enable Phone Auth:** Firebase Console → Authentication → Sign-in method → Enable Phone
2. **Add Test Number:** +1 555 123 4567 → Code: 123456
3. **Restart Dev Server:** `npm run dev`
4. **Test:** Enter (555) 123-4567 → Code: 123456
5. **Done!** 🎉

---

**Last Updated:** 2025-10-07
**Status:** Ready for testing after Firebase Console setup

