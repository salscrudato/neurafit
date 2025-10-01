import { onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import { getStripeClient } from './lib/stripe';
import * as functions from 'firebase-functions/v2';
import type Stripe from 'stripe';

// Interface for Stripe subscription with period properties
interface StripeSubscriptionWithPeriod {
  current_period_start?: number
  current_period_end?: number
  [key: string]: unknown
}

// Define Stripe secret key
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

// Initialize Firestore
const db = getFirestore();

/**
 * Emergency subscription fix function
 * Directly updates Firestore with active subscription data
 */
export const emergencySubscriptionFix = onCall(
  {
    region: 'us-central1',
    secrets: [stripeSecretKey],
  },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const { subscriptionId, forceActive = false } = data;
    if (!subscriptionId) {
      throw new functions.https.HttpsError('invalid-argument', 'Subscription ID is required');
    }

    console.log(`🚨 Emergency fix for subscription: ${subscriptionId}`);
    console.log(`👤 User: ${auth.uid}`);

    try {
      const stripeInstance = getStripeClient(stripeSecretKey.value());
      
      // Step 1: Get current Firestore data
      const userDocRef = db.collection('users').doc(auth.uid);
      const userDoc = await userDocRef.get();
      
      console.log('📊 Current Firestore data:');
      if (userDoc.exists) {
        const currentData = userDoc.data();
        console.log('Current status:', currentData?.subscription?.status);
        console.log('Current subscription ID:', currentData?.subscription?.subscriptionId);
      } else {
        console.log('User document does not exist');
      }

      // Step 2: Try to get subscription from Stripe
      let stripeSubscription = null;
      try {
        stripeSubscription = await stripeInstance.subscriptions.retrieve(subscriptionId, {
          expand: ['latest_invoice', 'customer']
        });
        console.log('✅ Found subscription in Stripe:', stripeSubscription.status);
      } catch (stripeError) {
        console.log('⚠️ Could not retrieve from Stripe:', stripeError);
        
        if (!forceActive) {
          throw new functions.https.HttpsError('not-found', 'Subscription not found in Stripe and forceActive not set');
        }
      }

      // Step 3: Prepare subscription data
      let subscriptionData;
      
      if (stripeSubscription && (stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing')) {
        // Use real Stripe data
        subscriptionData = {
          subscriptionId: stripeSubscription.id,
          customerId: typeof stripeSubscription.customer === 'string' 
            ? stripeSubscription.customer 
            : stripeSubscription.customer?.id || '',
          status: stripeSubscription.status,
          priceId: stripeSubscription.items.data[0]?.price.id || 'price_1SCzf7QjUU16Imh7y9nLUIvP',
          workoutCount: 0,
          freeWorkoutsUsed: 0,
          freeWorkoutLimit: 5,
          currentPeriodStart: 'current_period_start' in stripeSubscription && typeof (stripeSubscription as unknown as StripeSubscriptionWithPeriod).current_period_start === 'number' ? (stripeSubscription as unknown as StripeSubscriptionWithPeriod).current_period_start! * 1000 : Date.now(),
          currentPeriodEnd: 'current_period_end' in stripeSubscription && typeof (stripeSubscription as unknown as StripeSubscriptionWithPeriod).current_period_end === 'number' ? (stripeSubscription as unknown as StripeSubscriptionWithPeriod).current_period_end! * 1000 : Date.now() + 30 * 24 * 60 * 60 * 1000,
          cancelAtPeriodEnd: (stripeSubscription as Stripe.Subscription).cancel_at_period_end || false,
          createdAt: (stripeSubscription as Stripe.Subscription).created * 1000,
          updatedAt: Date.now()
        };
        console.log('📋 Using Stripe data for subscription');
      } else if (forceActive) {
        // Force active subscription
        subscriptionData = {
          subscriptionId: subscriptionId,
          customerId: `cus_emergency_${Date.now()}`,
          status: 'active',
          priceId: 'price_1SCzf7QjUU16Imh7y9nLUIvP',
          workoutCount: 0,
          freeWorkoutsUsed: 0,
          freeWorkoutLimit: 5,
          currentPeriodStart: Date.now(),
          currentPeriodEnd: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
          cancelAtPeriodEnd: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        console.log('🚨 Force activating subscription');
      } else {
        throw new functions.https.HttpsError('failed-precondition', 'Subscription is not active in Stripe and forceActive not set');
      }

      // Step 4: Update Firestore
      await userDocRef.set({
        subscription: subscriptionData
      }, { merge: true });

      console.log('✅ Firestore updated successfully');

      // Step 5: Verify the update
      const verifyDoc = await userDocRef.get();
      const verifyData = verifyDoc.data();
      
      console.log('🔍 Verification:');
      console.log('Status:', verifyData?.subscription?.status);
      console.log('Updated At:', new Date(verifyData?.subscription?.updatedAt || 0));

      // Step 6: Try to trigger a webhook-like update if we have Stripe data
      if (stripeSubscription) {
        try {
          // Import the webhook handler functions
          const { updateUserSubscription } = await import('./lib/stripe');
          
          await updateUserSubscription(auth.uid, {
            subscriptionId: stripeSubscription.id,
            status: stripeSubscription.status as 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid',
            priceId: stripeSubscription.items.data[0]?.price.id,
            currentPeriodStart: 'current_period_start' in stripeSubscription && typeof (stripeSubscription as unknown as StripeSubscriptionWithPeriod).current_period_start === 'number' ? (stripeSubscription as unknown as StripeSubscriptionWithPeriod).current_period_start! * 1000 : Date.now(),
            currentPeriodEnd: 'current_period_end' in stripeSubscription && typeof (stripeSubscription as unknown as StripeSubscriptionWithPeriod).current_period_end === 'number' ? (stripeSubscription as unknown as StripeSubscriptionWithPeriod).current_period_end! * 1000 : Date.now() + 30 * 24 * 60 * 60 * 1000,
            cancelAtPeriodEnd: (stripeSubscription as Stripe.Subscription).cancel_at_period_end || false,
            updatedAt: Date.now()
          });
          
          console.log('✅ Webhook-style update completed');
        } catch (webhookError) {
          console.log('⚠️ Webhook-style update failed:', webhookError);
          // Not critical, continue
        }
      }

      return {
        success: true,
        message: 'Subscription fixed successfully',
        subscriptionData: {
          id: subscriptionData.subscriptionId,
          status: subscriptionData.status,
          updatedAt: subscriptionData.updatedAt
        },
        method: stripeSubscription ? 'stripe_sync' : 'force_active'
      };

    } catch (error) {
      console.error('❌ Emergency fix failed:', error);
      
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      
      throw new functions.https.HttpsError('internal', `Emergency fix failed: ${error}`);
    }
  }
);

/**
 * List all users with subscription issues for debugging
 */
export const debugAllSubscriptions = onCall(
  {
    region: 'us-central1',
    secrets: [stripeSecretKey],
  },
  async (request) => {
    const { auth } = request;

    if (!auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    console.log(`🔍 Debug all subscriptions for user: ${auth.uid}`);

    try {
      // Get user's subscription data
      const userDocRef = db.collection('users').doc(auth.uid);
      const userDoc = await userDocRef.get();
      
      if (!userDoc.exists) {
        return {
          success: false,
          message: 'User document not found',
          userData: null
        };
      }

      const userData = userDoc.data();
      const subscription = userData?.subscription;

      console.log('📊 User subscription data:', subscription);

      // If there's a subscription ID, check Stripe
      let stripeData = null;
      if (subscription?.subscriptionId) {
        try {
          const stripeInstance = getStripeClient(stripeSecretKey.value());
          const stripeSubscription = await stripeInstance.subscriptions.retrieve(subscription.subscriptionId);
          
          stripeData = {
            id: stripeSubscription.id,
            status: stripeSubscription.status,
            current_period_start: 'current_period_start' in stripeSubscription && typeof (stripeSubscription as unknown as StripeSubscriptionWithPeriod).current_period_start === 'number' ? (stripeSubscription as unknown as StripeSubscriptionWithPeriod).current_period_start! : Math.floor(Date.now() / 1000),
            current_period_end: 'current_period_end' in stripeSubscription && typeof (stripeSubscription as unknown as StripeSubscriptionWithPeriod).current_period_end === 'number' ? (stripeSubscription as unknown as StripeSubscriptionWithPeriod).current_period_end! : Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
            cancel_at_period_end: (stripeSubscription as Stripe.Subscription).cancel_at_period_end
          };
          
          console.log('📊 Stripe subscription data:', stripeData);
        } catch (stripeError) {
          console.log('⚠️ Could not retrieve from Stripe:', stripeError);
          stripeData = { error: (stripeError as Error)?.message || 'Unknown error' };
        }
      }

      return {
        success: true,
        userData: {
          uid: auth.uid,
          subscription: subscription || null,
          lastUpdated: userData?.subscription?.updatedAt ? new Date(userData.subscription.updatedAt) : null
        },
        stripeData,
        recommendations: generateRecommendations(subscription, stripeData)
      };

    } catch (error) {
      console.error('❌ Debug failed:', error);
      throw new functions.https.HttpsError('internal', `Debug failed: ${error}`);
    }
  }
);

function generateRecommendations(firestoreSubscription: Record<string, unknown> | null, stripeData: Record<string, unknown> | null): string[] {
  const recommendations: string[] = [];

  if (!firestoreSubscription) {
    recommendations.push('No subscription data in Firestore - user may need to create a subscription');
    return recommendations;
  }

  if (firestoreSubscription.status === 'incomplete') {
    recommendations.push('Subscription is stuck in incomplete status - run emergency fix');
  }

  if (stripeData && stripeData.status !== firestoreSubscription.status) {
    recommendations.push(`Status mismatch: Firestore=${firestoreSubscription.status}, Stripe=${stripeData.status} - sync needed`);
  }

  if (stripeData && stripeData.error) {
    recommendations.push('Subscription not found in Stripe - may need to recreate or use forceActive');
  }

  const lastUpdate = firestoreSubscription.updatedAt;
  const lastUpdateTime = typeof lastUpdate === 'number' ? lastUpdate : (lastUpdate && typeof lastUpdate === 'object' && 'toMillis' in lastUpdate ? (lastUpdate as { toMillis(): number }).toMillis() : 0);
  if (lastUpdateTime && Date.now() - lastUpdateTime > 24 * 60 * 60 * 1000) {
    recommendations.push('Subscription data is more than 24 hours old - may need refresh');
  }

  if (recommendations.length === 0) {
    recommendations.push('Subscription appears to be in good state');
  }

  return recommendations;
}
