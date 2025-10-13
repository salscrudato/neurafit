# Phone Authentication Test Plan

## Test Environment Setup

### Prerequisites
1. Firebase project with Phone Authentication enabled
2. Test phone numbers configured in Firebase Console
3. Development server running (`npm run dev`)
4. Browser with developer tools open

### Test Phone Numbers (Development)
Configure in Firebase Console → Authentication → Sign-in method → Phone:
- Phone: `+1 555-123-4567`
- Code: `123456`

## Manual Test Cases

### 1. Phone Number Entry Flow

#### Test 1.1: Basic Phone Entry
**Steps:**
1. Navigate to auth page
2. Click "Continue with Phone" button
3. Verify modal opens
4. Verify phone input is auto-focused
5. Enter phone number: `5551234567`
6. Verify formatting: `(555) 123-4567`
7. Click "Send Verification Code"
8. Verify loading state appears
9. Verify modal switches to code entry step

**Expected Results:**
- ✅ Modal opens smoothly with fade-in animation
- ✅ Phone input has focus (cursor blinking)
- ✅ Phone number formats as user types
- ✅ Button shows loading spinner
- ✅ Transitions to code step without errors

#### Test 1.2: Phone Number Validation
**Steps:**
1. Open phone modal
2. Enter invalid phone: `123`
3. Click submit
4. Verify error message

**Expected Results:**
- ✅ Error: "Please enter a valid 10-digit US phone number"
- ✅ Input remains focused
- ✅ User can correct and resubmit

#### Test 1.3: Auto-formatting
**Test Cases:**
| Input | Expected Format |
|-------|----------------|
| `5` | `(5` |
| `555` | `(555` |
| `5551` | `(555) 1` |
| `5551234` | `(555) 123-4` |
| `5551234567` | `(555) 123-4567` |

#### Test 1.4: Keyboard Navigation
**Steps:**
1. Open modal
2. Type phone number
3. Press Enter key
4. Verify form submits

**Expected Results:**
- ✅ Enter key submits form
- ✅ Tab key moves between elements
- ✅ Escape key closes modal

### 2. Verification Code Flow

#### Test 2.1: Code Entry
**Steps:**
1. Complete phone entry step
2. Verify code input is auto-focused
3. Enter code: `123456`
4. Verify auto-submit after 6th digit

**Expected Results:**
- ✅ Code input has focus immediately
- ✅ Only numeric input accepted
- ✅ Auto-submits 300ms after 6th digit
- ✅ Loading state shows during verification
- ✅ User authenticated on success

#### Test 2.2: Invalid Code
**Steps:**
1. Enter invalid code: `000000`
2. Wait for verification
3. Verify error message

**Expected Results:**
- ✅ Error: "Invalid code. Please check and try again."
- ✅ Code input cleared or remains for retry
- ✅ User can enter new code

#### Test 2.3: Resend Code
**Steps:**
1. On code entry step
2. Click "Resend code" button
3. Verify cooldown timer starts
4. Wait for cooldown
5. Click resend again

**Expected Results:**
- ✅ Button disabled during cooldown
- ✅ Shows countdown: "Resend code (60s)" → "Resend code (59s)" → ...
- ✅ Button enabled after cooldown
- ✅ New code sent successfully
- ✅ Previous code input cleared

#### Test 2.4: Use Different Number
**Steps:**
1. On code entry step
2. Click "Use a different phone number"
3. Verify returns to phone step

**Expected Results:**
- ✅ Modal returns to phone entry
- ✅ Previous phone number cleared
- ✅ Code input cleared
- ✅ Can enter new phone number

### 3. Error Handling

#### Test 3.1: Rate Limiting
**Steps:**
1. Submit phone number multiple times rapidly
2. Trigger rate limit error

**Expected Results:**
- ✅ Error: "Too many attempts. Please wait a few minutes and try again."
- ✅ User informed of wait time
- ✅ Can retry after waiting

#### Test 3.2: Expired Code
**Steps:**
1. Request verification code
2. Wait for code to expire (usually 5-10 minutes)
3. Enter expired code

**Expected Results:**
- ✅ Error: "Code expired. Please request a new one."
- ✅ Automatically returns to phone step
- ✅ Can request new code

#### Test 3.3: Network Error
**Steps:**
1. Disable network
2. Try to submit phone number
3. Verify error handling

**Expected Results:**
- ✅ Error message displayed
- ✅ Loading state cleared
- ✅ User can retry when network restored

### 4. Accessibility Testing

#### Test 4.1: Screen Reader
**Tools:** VoiceOver (Mac), NVDA (Windows), TalkBack (Android)

**Steps:**
1. Enable screen reader
2. Navigate to phone auth
3. Verify all elements announced correctly

**Expected Announcements:**
- ✅ "Sign in with Phone, button"
- ✅ "Phone number, edit text, telephone"
- ✅ "US numbers only. Standard messaging rates may apply"
- ✅ "Send Verification Code, button"
- ✅ "Verification code, edit text, numeric"
- ✅ "Loading" when submitting

#### Test 4.2: Keyboard Only
**Steps:**
1. Navigate entire flow using only keyboard
2. No mouse/touch input

**Expected Results:**
- ✅ Can open modal with keyboard
- ✅ Can navigate all inputs with Tab
- ✅ Can submit with Enter
- ✅ Can close with Escape
- ✅ Focus visible on all elements

#### Test 4.3: High Contrast Mode
**Steps:**
1. Enable high contrast mode
2. Verify all elements visible

**Expected Results:**
- ✅ All text readable
- ✅ Buttons clearly visible
- ✅ Focus indicators visible
- ✅ Error messages stand out

### 5. Mobile Testing

#### Test 5.1: iOS Safari
**Steps:**
1. Open on iPhone
2. Test phone auth flow
3. Verify SMS autofill works

**Expected Results:**
- ✅ Numeric keyboard appears for phone input
- ✅ SMS code autofill suggestion appears
- ✅ Tapping suggestion fills code
- ✅ Touch targets easy to tap (48px min)

#### Test 5.2: Android Chrome
**Steps:**
1. Open on Android device
2. Test phone auth flow
3. Verify SMS retrieval

**Expected Results:**
- ✅ Numeric keyboard appears
- ✅ SMS code auto-detected
- ✅ One-tap to fill code
- ✅ All interactions smooth

#### Test 5.3: Landscape Mode
**Steps:**
1. Rotate device to landscape
2. Verify modal still usable

**Expected Results:**
- ✅ Modal fits on screen
- ✅ All elements accessible
- ✅ Keyboard doesn't obscure inputs

### 6. Performance Testing

#### Test 6.1: Load Time
**Steps:**
1. Open auth page
2. Measure time to interactive
3. Open phone modal
4. Measure reCAPTCHA init time

**Expected Results:**
- ✅ Page loads < 2 seconds
- ✅ Modal opens < 100ms
- ✅ reCAPTCHA ready < 500ms

#### Test 6.2: Memory Leaks
**Steps:**
1. Open and close modal 10 times
2. Check memory usage in DevTools

**Expected Results:**
- ✅ Memory usage stable
- ✅ No memory leaks
- ✅ reCAPTCHA properly cleaned up

### 7. Edge Cases

#### Test 7.1: Rapid Input Changes
**Steps:**
1. Type phone number quickly
2. Delete and retype
3. Verify formatting stays correct

**Expected Results:**
- ✅ Formatting always correct
- ✅ No visual glitches
- ✅ Cursor position maintained

#### Test 7.2: Copy/Paste
**Steps:**
1. Copy phone number: `5551234567`
2. Paste into input
3. Verify formatting applied

**Expected Results:**
- ✅ Pasted number formatted correctly
- ✅ Can submit immediately

#### Test 7.3: Browser Autofill
**Steps:**
1. Use browser's autofill for phone
2. Verify formatting applied

**Expected Results:**
- ✅ Autofilled number formatted
- ✅ Validation works correctly

## Automated Testing (Future)

### Unit Tests
```typescript
// PhoneAuthModal.test.tsx
describe('PhoneAuthModal', () => {
  it('formats phone number correctly', () => {})
  it('validates phone number', () => {})
  it('auto-submits code at 6 digits', () => {})
  it('shows resend cooldown', () => {})
})
```

### Integration Tests
```typescript
// phone-auth.integration.test.tsx
describe('Phone Authentication Flow', () => {
  it('completes full sign-in flow', () => {})
  it('handles errors gracefully', () => {})
  it('resends code successfully', () => {})
})
```

## Test Results Template

### Test Session: [Date]
**Tester:** [Name]
**Environment:** [Browser/Device]
**Build:** [Version]

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 1.1 | Basic Phone Entry | ✅ Pass | |
| 1.2 | Phone Validation | ✅ Pass | |
| 2.1 | Code Entry | ✅ Pass | |
| 2.3 | Resend Code | ✅ Pass | |
| ... | ... | ... | |

**Issues Found:**
1. [Issue description]
2. [Issue description]

**Overall Assessment:** [Pass/Fail]

## Regression Testing

Run this test plan before:
- ✅ Every production deployment
- ✅ After phone auth code changes
- ✅ After Firebase SDK updates
- ✅ After major dependency updates

## Sign-off

**Tested by:** _______________
**Date:** _______________
**Approved by:** _______________
**Date:** _______________

