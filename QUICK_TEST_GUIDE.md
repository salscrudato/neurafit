# Quick Phone Auth Test Guide

## ⚠️ Current Error: `auth/invalid-app-credential`

This error means you need to add **test phone numbers** in Firebase Console to bypass reCAPTCHA during development.

---

## 🚀 Quick Fix (5 minutes)

### Step 1: Add Test Phone Numbers
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **neurafit**
3. Go to **Authentication** → **Sign-in method** tab
4. Scroll down to **"Phone numbers for testing"** section
5. Click **"Add phone number"**
6. Add this test number:
   ```
   Phone number: +15551234567
   Test code: 123456
   ```
7. Click **Add**

### Step 2: Test in Your App
1. Restart your dev server (just to be safe)
2. Open your app: `http://localhost:5173`
3. Click **"Continue with Phone"**
4. Enter: `(555) 123-4567`
5. Click **"Send Verification Code"**
6. Enter code: `123456`
7. Click **"Verify & Sign In"**
8. ✅ You should be signed in!

---

## 📱 Test Phone Numbers to Add

Add these in Firebase Console for testing:

| Phone Number | Test Code | Purpose |
|--------------|-----------|---------|
| +15551234567 | 123456 | Primary test number |
| +15559876543 | 654321 | Secondary test number |
| +15555555555 | 111111 | Quick test |

---

## 🔍 Why This Error Happens

The error `auth/invalid-app-credential` occurs because:

1. **reCAPTCHA v2 key is invalid** - The key `6LcMZR0UAAAAALgPMcgHwga7gY5p8QMg1Hj-bmUv` is unauthorized
2. **Firebase falls back to reCAPTCHA v2** when reCAPTCHA Enterprise isn't configured
3. **Test phone numbers bypass reCAPTCHA** - This is the easiest solution for development

---

## 🎯 What Happens When You Add Test Numbers

✅ **With test numbers:**
- No reCAPTCHA needed
- No SMS sent (saves money)
- Instant verification
- Perfect for development

❌ **Without test numbers:**
- Requires valid reCAPTCHA
- Sends real SMS (costs money)
- Requires billing enabled
- Slower testing

---

## 🔧 Alternative: Enable reCAPTCHA Enterprise (Optional)

If you want to test with real phone numbers:

### Option A: Use Firebase App Check (Recommended)
1. Go to Firebase Console → **App Check**
2. Click **Get started**
3. Register your web app
4. Follow the setup instructions

### Option B: Configure reCAPTCHA v3 (Advanced)
1. Go to [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Create a new site
3. Choose reCAPTCHA v3
4. Add your domains
5. Get the site key
6. Configure in Firebase

**Note:** For development, test phone numbers are much easier!

---

## 📊 Current Setup Status

✅ Phone authentication enabled in Firebase
✅ Code updated to handle phone auth
✅ UI components created
✅ Auto-adds +1 to phone numbers
✅ 50 free workouts for new users

⚠️ **Missing:** Test phone numbers (add them now!)

---

## 🐛 Troubleshooting

### Error: "auth/invalid-app-credential"
**Solution:** Add test phone numbers (see Step 1 above)

### Error: "auth/captcha-check-failed"
**Solution:** Add test phone numbers OR enable App Check

### Error: "auth/quota-exceeded"
**Solution:** You've exceeded SMS quota. Use test numbers instead.

### reCAPTCHA 401 errors in console
**Solution:** These are expected. Add test phone numbers to bypass reCAPTCHA.

### Phone number not working
**Solution:** 
- Make sure you added the test number in Firebase Console
- Use the exact format: `+15551234567`
- In the app, enter: `(555) 123-4567` (app adds +1 automatically)

---

## 📝 Testing Checklist

- [ ] Added test phone number in Firebase Console
- [ ] Restarted dev server
- [ ] Opened phone auth modal
- [ ] Entered test phone number: (555) 123-4567
- [ ] Clicked "Send Verification Code"
- [ ] Entered test code: 123456
- [ ] Successfully signed in
- [ ] Verified 50 free workouts in Profile

---

## 💡 Pro Tips

1. **Use test numbers for all development** - Saves money and time
2. **Add multiple test numbers** - For testing different scenarios
3. **Don't commit test numbers to code** - Keep them in Firebase Console only
4. **For production** - Enable billing and use real phone numbers
5. **Monitor SMS usage** - Check Firebase Console → Authentication → Usage

---

## 🎉 Success Criteria

You'll know it's working when:
1. ✅ No `auth/invalid-app-credential` error
2. ✅ Modal shows "Enter Verification Code" step
3. ✅ User is signed in after entering code
4. ✅ Profile shows 50 free workouts
5. ✅ No reCAPTCHA errors in console (when using test numbers)

---

## 📞 Need Help?

If you're still having issues:

1. **Check Firebase Console:**
   - Authentication → Sign-in method → Phone is enabled ✓
   - Authentication → Sign-in method → Test phone numbers added ✓
   - Authentication → Settings → Authorized domains includes localhost ✓

2. **Check Browser Console:**
   - Look for the specific error code
   - Check if reCAPTCHA is loading
   - Verify phone number format

3. **Try these:**
   - Clear browser cache
   - Try incognito mode
   - Restart dev server
   - Check Firebase project is correct

---

**Last Updated:** 2025-10-07
**Status:** Waiting for test phone numbers to be added in Firebase Console

---

## 🚀 Next Steps After Testing

Once phone auth is working:

1. **Deploy to production:**
   ```bash
   npm run build
   firebase deploy
   ```

2. **Enable billing** (for real SMS in production)

3. **Monitor usage** in Firebase Console

4. **Set up alerts** for unusual activity

5. **Consider App Check** for additional security

