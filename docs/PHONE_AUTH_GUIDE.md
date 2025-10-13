# Phone Authentication Implementation Guide

## Overview

NeuraFit implements Firebase Phone Authentication with invisible reCAPTCHA for a seamless, secure mobile sign-in experience.

## Features

### ✅ Implemented Features

1. **Invisible reCAPTCHA** - No user interaction required for bot protection
2. **Auto-formatting** - Phone numbers formatted as (XXX) XXX-XXXX for better UX
3. **Auto-submit** - Verification code auto-submits when 6 digits are entered
4. **Auto-focus** - Inputs automatically focused when modal opens
5. **Resend Code** - 60-second cooldown timer for resending verification codes
6. **Error Recovery** - Comprehensive error handling with user-friendly messages
7. **Loading States** - Visual feedback during all async operations
8. **Accessibility** - ARIA labels, roles, and keyboard navigation support
9. **Mobile Optimized** - Touch-friendly inputs with proper input modes
10. **Analytics Tracking** - Sign-up and login events tracked

## Architecture

### Components

#### `PhoneAuthModal.tsx`
- Two-step modal: phone entry → code verification
- Manages local state for phone number and verification code
- Auto-focus and auto-submit functionality
- Resend code with cooldown timer

#### `Auth.tsx`
- Manages reCAPTCHA verifier lifecycle
- Handles Firebase phone authentication flow
- Error handling and user feedback
- Integration with analytics

### State Management

```typescript
// Auth.tsx state
const [showPhoneModal, setShowPhoneModal] = useState(false)
const [phoneStep, setPhoneStep] = useState<'phone' | 'code'>('phone')
const [phoneNumber, setPhoneNumber] = useState('')
const [phoneError, setPhoneError] = useState('')
const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null)

// PhoneAuthModal.tsx state
const [localPhoneNumber, setLocalPhoneNumber] = useState('')
const [verificationCode, setVerificationCode] = useState('')
const [resendCooldown, setResendCooldown] = useState(0)
```

## User Flow

### 1. Phone Number Entry
1. User clicks "Continue with Phone" button
2. Modal opens with phone input auto-focused
3. User enters phone number (auto-formatted)
4. User submits (or presses Enter)
5. reCAPTCHA verification happens invisibly
6. SMS code sent to phone number

### 2. Code Verification
1. Modal switches to code entry step
2. Code input auto-focused
3. User enters 6-digit code
4. Code auto-submits when complete
5. User authenticated and redirected

### 3. Error Scenarios
- Invalid phone number → Clear error message
- Too many requests → Rate limit message with retry guidance
- Invalid code → Error shown, user can retry
- Expired code → User prompted to request new code
- reCAPTCHA failure → User prompted to refresh

## Error Handling

### Firebase Error Codes

| Error Code | User Message | Recovery Action |
|------------|--------------|-----------------|
| `auth/invalid-phone-number` | Invalid phone number format | User corrects input |
| `auth/too-many-requests` | Too many attempts. Wait and retry | User waits |
| `auth/quota-exceeded` | SMS quota exceeded | Contact support |
| `auth/captcha-check-failed` | Verification failed. Refresh page | Reinitialize reCAPTCHA |
| `auth/invalid-verification-code` | Invalid code. Try again | User re-enters code |
| `auth/code-expired` | Code expired. Request new one | Return to phone step |
| `auth/session-expired` | Session expired. Start over | Return to phone step |

## Security Features

### 1. reCAPTCHA Protection
- Invisible reCAPTCHA v2 (no user interaction)
- Automatic bot detection
- Fallback to visible challenge if needed

### 2. Rate Limiting
- Firebase built-in rate limiting
- 60-second cooldown on resend
- User-friendly error messages

### 3. Input Validation
- Phone number: 10 digits (US only)
- Verification code: 6 digits numeric
- Client-side validation before API calls

## Accessibility

### ARIA Labels
```tsx
<input
  aria-label="Phone number"
  aria-describedby="phone-hint"
  inputMode="tel"
/>

<input
  aria-label="Verification code"
  aria-describedby="code-hint"
  inputMode="numeric"
/>
```

### Keyboard Navigation
- Tab navigation through all interactive elements
- Enter key submits forms
- Escape key closes modal (standard browser behavior)

### Screen Reader Support
- Loading states announced with `role="status"`
- Error messages linked to inputs via `aria-describedby`
- Button states clearly labeled

## Mobile Optimization

### Input Modes
```tsx
// Phone input
inputMode="tel"        // Shows numeric keyboard with phone symbols
autoComplete="tel"     // Enables autofill

// Code input
inputMode="numeric"    // Shows numeric keyboard
autoComplete="one-time-code"  // iOS SMS code autofill
pattern="[0-9]*"       // Ensures numeric input
```

### Touch Targets
- Minimum 48px height for all interactive elements
- `touch-manipulation` CSS for better touch response
- Proper spacing between buttons

## Testing

### Manual Testing Checklist

#### Phone Entry
- [ ] Phone number auto-formats as user types
- [ ] Submit button disabled until valid phone entered
- [ ] Loading state shows during submission
- [ ] Error messages display correctly
- [ ] reCAPTCHA initializes without errors

#### Code Verification
- [ ] Code input auto-focuses
- [ ] Only numeric input accepted
- [ ] Auto-submits at 6 digits
- [ ] Resend button shows cooldown timer
- [ ] "Use different number" returns to phone step

#### Error Handling
- [ ] Invalid phone number shows error
- [ ] Invalid code shows error
- [ ] Expired code returns to phone step
- [ ] Rate limiting shows appropriate message

### Test Phone Numbers (Development)

Firebase allows test phone numbers in development:

1. Go to Firebase Console → Authentication → Sign-in method → Phone
2. Add test phone numbers:
   - Phone: `+1 555-123-4567`
   - Code: `123456`

## Configuration

### Firebase Console Setup

1. **Enable Phone Authentication**
   - Go to Authentication → Sign-in method
   - Enable "Phone" provider

2. **Configure reCAPTCHA**
   - Add authorized domains
   - Configure reCAPTCHA v2 (invisible)

3. **Add Test Numbers** (Development)
   - Add test phone numbers for development

### Environment Variables

No additional environment variables needed. Uses existing Firebase config:
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

### Content Security Policy

Ensure CSP allows reCAPTCHA domains (already configured in `firebase.json`):
```
connect-src: https://www.google.com/recaptcha/ https://recaptcha.google.com
frame-src: https://www.google.com https://recaptcha.google.com
```

## Performance

### Optimizations
1. **Lazy reCAPTCHA initialization** - Only loads when modal opens
2. **Proper cleanup** - reCAPTCHA cleared when modal closes
3. **Debounced auto-submit** - 300ms delay for better UX
4. **Minimal re-renders** - Optimized state updates

### Bundle Size
- Firebase Auth: ~50KB (gzipped)
- reCAPTCHA: ~30KB (loaded on-demand)

## Future Enhancements

### Potential Improvements
1. **International Support** - Support for non-US phone numbers
2. **SMS Retrieval API** - Auto-fill code on Android
3. **Voice Call Fallback** - Alternative to SMS
4. **Remember Device** - Skip verification for trusted devices
5. **Multi-factor Auth** - Add phone as 2FA option

## Troubleshooting

### Common Issues

**Issue**: reCAPTCHA not loading
- **Solution**: Check CSP headers, ensure domains whitelisted

**Issue**: SMS not received
- **Solution**: Check Firebase quota, verify phone number format

**Issue**: "Too many requests" error
- **Solution**: Wait 15-30 minutes, use test numbers in development

**Issue**: Code auto-submit not working
- **Solution**: Check browser console for errors, ensure code length === 6

## Support

For issues or questions:
1. Check Firebase Console logs
2. Review browser console for errors
3. Check Sentry for production errors
4. Review this documentation

---

**Last Updated**: 2025-01-13
**Version**: 1.0.0

