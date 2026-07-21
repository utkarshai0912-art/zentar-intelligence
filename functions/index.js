// =============================================================================
// Zentar Intelligence - Firebase Cloud Functions
// =============================================================================
//
// Architecture:
//   All callable functions use functions.https.onCall — Firebase auto-handles
//   auth verification. The HTTP webhook uses functions.https.onRequest since
//   Razorpay sends unsigned requests.
//
// Secrets Management:
//   API keys are injected via Firebase Secret Manager using
//   functions.runWith({ secrets: [...] }). NEVER store keys in client code.
//
// Rate Limiting Notes:
//   - Firebase callable functions do not have built-in per-user rate limiting.
//     For production, consider:
//     a) Enforcing rate limits via Firestore write timestamps (check last
//        request time in the user doc before processing).
//     b) Using Firebase Security Rules + Firestore counters for burst control.
//     c) Deploying a separate rate-limiting middleware via Firebase Extensions
//        (e.g., "Rate Limiter" extension).
//   - The Razorpay webhook endpoint should return 200 quickly. Heavy processing
//     (e.g., email notifications) should be offloaded to Firestore-triggered
//     functions or a task queue.
//
// Firestore Collections:
//   users/{uid}                          — User profile & subscription data
//   tools/{toolId}                       — Tool metadata (publicly readable)
//   tool_instructions/{toolId}           — System prompts (server-only)
//   generations/{uid}/history/{entry}    — AI generation history
//   transactions/{uid}/payments/{payment} — Payment transaction records
//   orders/{orderId}                     — Order-to-user mapping (for webhooks)
// =============================================================================

import admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import crypto from 'node:crypto';

// ─── Firebase Admin Initialization ───────────────────────────────────────────
// In Cloud Functions, the Admin SDK is pre-configured with the project's
// default service account. No manual config needed.
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();
const FieldValue = admin.firestore.FieldValue;

// ─── Secret Definitions ──────────────────────────────────────────────────────
// These map to secrets set via `firebase functions:secrets:set SECRET_NAME`.
// They are injected as environment variables at runtime.
const AI_API_KEY = defineSecret('AI_API_KEY');
const RAZORPAY_KEY_SECRET = defineSecret('RAZORPAY_KEY_SECRET');
const RAZORPAY_WEBHOOK_SECRET = defineSecret('RAZORPAY_WEBHOOK_SECRET');

// ─── Constants ───────────────────────────────────────────────────────────────

const PLAN_PRICES = {
  pro: { amount: 49900, label: 'Pro', currency: 'INR' },
  business: { amount: 149900, label: 'Business', currency: 'INR' },
};

const PLAN_CREDITS = {
  free: 30,
  pro: 300,
  business: 9999, // effectively unlimited
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Look up a tool document by its slug.
 * Returns the tool data { id, name, slug, is_premium, ... } or null.
 */
async function getToolBySlug(toolSlug) {
  const toolsSnap = await db
    .collection('tools')
    .where('slug', '==', toolSlug)
    .limit(1)
    .get();

  if (toolsSnap.empty) return null;
  const doc = toolsSnap.docs[0];
  return { id: doc.id, ...doc.data() };
}

/**
 * Read the system instructions from the server-only collection.
 * This collection has Firestore rules denying all client reads.
 */
async function getToolInstructions(toolId) {
  const instrSnap = await db.collection('tool_instructions').doc(toolId).get();
  if (!instrSnap.exists) return null;
  return instrSnap.data().system_instructions || null;
}

/**
 * Verify an HMAC-SHA256 signature (used for Razorpay payment verification).
 */
function verifyHmacSignature(body, secret, expectedSignature) {
  const computed = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(expectedSignature)
  );
}

/**
 * Get a user document by UID, with plan defaults applied.
 */
async function getUserProfile(uid) {
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) return null;
  return { id: userSnap.id, ...userSnap.data() };
}

// =============================================================================
// 1. generateAI — Callable Function
// =============================================================================
//
// Called from the frontend after the user submits a tool form.
// Reads system instructions from the server-only tool_instructions collection
// so that prompts are never exposed to the client.
//
// Rate limit guidance:
//   Consider adding a last_request_at timestamp on the user document and
//   rejecting calls within a window (e.g., 5 seconds) per user.

export const generateAI = onCall(
  {
    secrets: [AI_API_KEY, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET],
    region: 'asia-south1',
    minInstances: 0,
    maxInstances: 100,
    concurrency: 80,
  },
  async (request) => {
    // ── Auth check ─────────────────────────────────────────────────────────
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be signed in to use this feature.'
      );
    }
    const uid = request.auth.uid;

    // ── Validate input ─────────────────────────────────────────────────────
    const { toolSlug, input, imageData } = request.data || {};

    if (!toolSlug || typeof toolSlug !== 'string') {
      throw new HttpsError(
        'invalid-argument',
        'The function must be called with a valid "toolSlug".'
      );
    }
    if (!input || typeof input !== 'string') {
      throw new HttpsError(
        'invalid-argument',
        'The function must be called with a non-empty "input" string.'
      );
    }

    // ── Look up the tool ───────────────────────────────────────────────────
    const tool = await getToolBySlug(toolSlug);
    if (!tool) {
      throw new HttpsError('not-found', `Tool "${toolSlug}" not found.`);
    }
    if (tool.is_active === false) {
      throw new HttpsError('failed-precondition', 'This tool is currently disabled.');
    }

    const isPremiumTool = tool.is_premium === true;

    // ── Read system instructions (server-only) ─────────────────────────────
    const systemInstructions = await getToolInstructions(tool.id);
    if (!systemInstructions) {
      throw new HttpsError(
        'internal',
        'Tool configuration error. Please contact support.'
      );
    }

    // ── Get user profile & check access ────────────────────────────────────
    const userProfile = await getUserProfile(uid);
    if (!userProfile) {
      throw new HttpsError(
        'not-found',
        'User profile not found. Please sign in again.'
      );
    }

    const planType = userProfile.plan_type || 'free';
    const creditsLeft = userProfile.credits_remaining ?? 0;

    // Premium tool check
    if (isPremiumTool && planType === 'free') {
      throw new HttpsError(
        'permission-denied',
        'This is a premium tool. Please upgrade your plan to access it.'
      );
    }

    // Credits check (business plan gets unlimited)
    if (planType !== 'business' && creditsLeft <= 0) {
      throw new HttpsError(
        'permission-denied',
        'You have no credits remaining. Please upgrade your plan or wait for your next billing cycle.'
      );
    }

    // ── Call the AI API ────────────────────────────────────────────────────
    const provider = process.env.AI_API_PROVIDER || 'openai';
    let output = '';

    try {
      if (provider === 'openai') {
        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.AI_API_KEY });

        const messages = [
          { role: 'system', content: systemInstructions },
        ];

        // Build user message with optional image
        if (imageData && typeof imageData === 'string') {
          // imageData should be a data URL: "data:image/png;base64,..."
          messages.push({
            role: 'user',
            content: [
              { type: 'text', text: input },
              {
                type: 'image_url',
                image_url: { url: imageData },
              },
            ],
          });
        } else {
          messages.push({ role: 'user', content: input });
        }

        const completion = await openai.chat.completions.create({
          model: process.env.AI_MODEL || 'gpt-4o-mini',
          messages,
          max_tokens: 4096,
        });

        output = completion.choices[0]?.message?.content || 'No response generated.';
      } else if (provider === 'anthropic') {
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        const anthropic = new Anthropic({ apiKey: process.env.AI_API_KEY });

        const messages = [];

        if (imageData && typeof imageData === 'string') {
          // Parse the data URL to extract mime type and base64
          const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            const mimeType = matches[1];
            const base64 = matches[2];
            messages.push({
              role: 'user',
              content: [
                { type: 'text', text: input },
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mimeType,
                    data: base64,
                  },
                },
              ],
            });
          } else {
            // Fallback: treat as text-only
            messages.push({ role: 'user', content: input });
          }
        } else {
          messages.push({ role: 'user', content: input });
        }

        const msg = await anthropic.messages.create({
          model: process.env.AI_MODEL || 'claude-3-haiku-20240307',
          system: systemInstructions,
          messages,
          max_tokens: 4096,
        });

        output = msg.content.map((block) => block.text || '').join('\n');
      } else {
        throw new HttpsError(
          'internal',
          `Unknown AI provider: ${provider}. Configure AI_API_PROVIDER as "openai" or "anthropic".`
        );
      }
    } catch (aiError) {
      logger.error('AI API call failed:', aiError);

      // If it's already an HttpsError, re-throw
      if (aiError instanceof HttpsError) throw aiError;

      throw new HttpsError(
        'internal',
        `AI generation failed: ${aiError.message || 'Unknown error'}`
      );
    }

    // ── Save generation to Firestore ───────────────────────────────────────
    try {
      await db
        .collection('generations')
        .doc(uid)
        .collection('history')
        .add({
          tool_id: toolSlug,
          tool_name: tool.name,
          input_data: input,
          output_data: output,
          created_at: FieldValue.serverTimestamp(),
        });
    } catch (saveError) {
      // Non-critical: log the error but don't block the response
      logger.error('Failed to save generation history:', saveError);
    }

    // ── Decrement credits (skip for business/unlimited plans) ──────────────
    if (planType !== 'business') {
      try {
        await db
          .collection('users')
          .doc(uid)
          .update({
            credits_remaining: FieldValue.increment(-1),
            last_generation_at: FieldValue.serverTimestamp(),
          });
      } catch (creditError) {
        logger.error('Failed to decrement credits:', creditError);
      }
    }

    // ── Return result ──────────────────────────────────────────────────────
    return { output };
  }
);

// =============================================================================
// 2. createRazorpayOrder — Callable Function
// =============================================================================
//
// Creates a Razorpay order and saves a transaction record. The frontend uses
// the returned orderId to open the Razorpay checkout.

export const createRazorpayOrder = onCall(
  {
    secrets: [AI_API_KEY, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET],
    region: 'asia-south1',
  },
  async (request) => {
    // ── Auth check ─────────────────────────────────────────────────────────
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be signed in to make a payment.'
      );
    }
    const uid = request.auth.uid;
    const { planId } = request.data || {};

    // ── Validate plan ──────────────────────────────────────────────────────
    if (!planId || typeof planId !== 'string') {
      throw new HttpsError(
        'invalid-argument',
        'A valid "planId" is required (pro or business).'
      );
    }

    const plan = PLAN_PRICES[planId];
    if (!plan) {
      throw new HttpsError(
        'invalid-argument',
        `Invalid planId "${planId}". Valid options: ${Object.keys(PLAN_PRICES).join(', ')}.`
      );
    }

    // ── Create Razorpay order ──────────────────────────────────────────────
    let order;
    try {
      const { default: Razorpay } = await import('razorpay');
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      order = await razorpay.orders.create({
        amount: plan.amount,
        currency: plan.currency,
        receipt: `receipt_${uid}_${Date.now()}`,
        notes: {
          userId: uid,
          planId: planId,
        },
      });
    } catch (razorpayError) {
      logger.error('Razorpay order creation failed:', razorpayError);
      throw new HttpsError(
        'internal',
        'Failed to create payment order. Please try again.'
      );
    }

    // ── Save transaction record ────────────────────────────────────────────
    try {
      await db
        .collection('transactions')
        .doc(uid)
        .collection('payments')
        .add({
          amount: plan.amount / 100, // store in rupees for readability
          currency: plan.currency,
          plan: planId,
          status: 'created',
          razorpay_order_id: order.id,
          created_at: FieldValue.serverTimestamp(),
        });

      // Save order-to-user mapping for webhook lookups
      await db
        .collection('orders')
        .doc(order.id)
        .set({
          userId: uid,
          planId: planId,
          created_at: FieldValue.serverTimestamp(),
        });
    } catch (saveError) {
      // Non-critical — the order is already created in Razorpay
      logger.error('Failed to save transaction record:', saveError);
    }

    // ── Return order details to frontend ───────────────────────────────────
    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    };
  }
);

// =============================================================================
// 3. verifyRazorpayPayment — Callable Function
// =============================================================================
//
// Called by the frontend after a successful Razorpay checkout UI flow.
// Verifies the HMAC signature, updates the transaction record, and activates
// the user's subscription.

export const verifyRazorpayPayment = onCall(
  {
    secrets: [AI_API_KEY, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET],
    region: 'asia-south1',
  },
  async (request) => {
    // ── Auth check ─────────────────────────────────────────────────────────
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be signed in to verify a payment.'
      );
    }
    const uid = request.auth.uid;

    // ── Validate input ─────────────────────────────────────────────────────
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, planId } =
      request.data || {};

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !planId) {
      throw new HttpsError(
        'invalid-argument',
        'Missing required fields: razorpay_payment_id, razorpay_order_id, razorpay_signature, planId.'
      );
    }

    // ── Verify HMAC signature ──────────────────────────────────────────────
    const signatureBody = `${razorpay_order_id}|${razorpay_payment_id}`;
    const isValid = verifyHmacSignature(
      signatureBody,
      process.env.RAZORPAY_KEY_SECRET,
      razorpay_signature
    );

    if (!isValid) {
      throw new HttpsError(
        'permission-denied',
        'Payment verification failed. Invalid signature.'
      );
    }

    // ── Update Firestore (in a transaction for consistency) ────────────────
    try {
      await db.runTransaction(async (tx) => {
        // Find the transaction record
        const txRef = await findTransactionByOrderIdRef(tx, uid, razorpay_order_id);

        if (!txRef) {
          // If no transaction found but signature is valid, create a minimal record
          const newTxRef = db
            .collection('transactions')
            .doc(uid)
            .collection('payments')
            .doc();

          tx.set(newTxRef, {
            amount: (PLAN_PRICES[planId]?.amount || 49900) / 100,
            currency: 'INR',
            plan: planId,
            status: 'captured',
            razorpay_order_id,
            razorpay_payment_id,
            created_at: FieldValue.serverTimestamp(),
          });
        } else {
          tx.update(txRef, {
            status: 'captured',
            razorpay_payment_id,
            updated_at: FieldValue.serverTimestamp(),
          });
        }

        // Activate the user's subscription
        const userRef = db.collection('users').doc(uid);
        const userSnap = await tx.get(userRef);

        if (!userSnap.exists) {
          throw new HttpsError('not-found', 'User profile not found.');
        }

        const renewalDate = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString();

        tx.update(userRef, {
          plan_type: planId,
          subscription_status: 'active',
          subscription_renewal_date: renewalDate,
          credits_remaining: PLAN_CREDITS[planId] || 300,
          updated_at: FieldValue.serverTimestamp(),
        });
      });
    } catch (txError) {
      logger.error('Transaction/update failed:', txError);

      if (txError instanceof HttpsError) throw txError;

      throw new HttpsError(
        'internal',
        'Failed to update your account after payment. Please contact support.'
      );
    }

    // ── Clean up order mapping ─────────────────────────────────────────────
    try {
      await db.collection('orders').doc(razorpay_order_id).delete();
    } catch {
      // Non-critical
    }

    return { success: true };
  }
);

/**
 * Helper for verifyRazorpayPayment: find a transaction reference within a
 * Firestore transaction by querying the user's payments subcollection.
 */
async function findTransactionByOrderIdRef(tx, uid, razorpayOrderId) {
  const txSnap = await tx.get(
    db
      .collection('transactions')
      .doc(uid)
      .collection('payments')
      .where('razorpay_order_id', '==', razorpayOrderId)
      .limit(1)
  );

  if (txSnap.empty) return null;
  return txSnap.docs[0].ref;
}

// =============================================================================
// 4. razorpayWebhook — HTTP (onRequest) Function
// =============================================================================
//
// Public HTTP endpoint called by Razorpay on payment events.
// Uses onRequest (not onCall) because Razorpay does not send Firebase auth.
//
// IMPORTANT: Return 200 quickly. Do not await heavy operations inline;
// use Firestore triggers or a task queue for secondary processing.

export const razorpayWebhook = onRequest(
  {
    secrets: [AI_API_KEY, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET],
    region: 'asia-south1',
    invoker: 'public',
  },
  async (req, res) => {
    // ── Method check ───────────────────────────────────────────────────────
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // ── Signature verification ─────────────────────────────────────────────
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('RAZORPAY_WEBHOOK_SECRET is not configured');
      res.status(500).json({ error: 'Webhook secret not configured' });
      return;
    }

    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      res.status(400).json({ error: 'Missing x-razorpay-signature header' });
      return;
    }

    // Razorpay sends the raw JSON body as the HMAC payload
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    // ── Parse event ────────────────────────────────────────────────────────
    const event = req.body;
    if (!event || !event.event) {
      res.status(400).json({ error: 'Invalid event payload' });
      return;
    }

    logger.info(`Webhook event received: ${event.event}`);

    try {
      switch (event.event) {
        // ── Payment Captured ───────────────────────────────────────────────
        case 'payment.captured': {
          const payment = event.payload.payment.entity;
          const orderId = payment.order_id;
          const paymentId = payment.id;
          const userId = payment.notes?.userId;
          const planId = payment.notes?.planId;

          if (!orderId) {
            logger.warn('payment.captured event missing order_id');
            break;
          }

          // Update the transaction and user
          await handlePaymentCaptured(userId, orderId, paymentId, planId);
          break;
        }

        // ── Payment Failed ─────────────────────────────────────────────────
        case 'payment.failed': {
          const payment = event.payload.payment.entity;
          const orderId = payment.order_id;
          const userId = payment.notes?.userId;
          const failedReason = payment.error_reason || 'Unknown';

          logger.warn(`Payment failed for order [REDACTED]: ${failedReason}`);

          // Mark the transaction as failed
          await markTransactionFailed(userId, orderId, failedReason);
          break;
        }

        // ── Subscription Cancelled / Expired ───────────────────────────────
        case 'subscription.cancelled':
        case 'subscription.expired': {
          const subscription = event.payload.subscription.entity;
          const userId = subscription.notes?.userId;

          if (userId) {
            await demoteUserToFree(userId);
          }
          break;
        }

        // ── Unhandled events ───────────────────────────────────────────────
        default:
          logger.info(`Unhandled webhook event type: ${event.event}`);
      }
    } catch (err) {
      // Log but do not return error to Razorpay (they will retry)
      logger.error('Webhook processing error:', err);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true });
  }
);

// ── Webhook Event Handlers ───────────────────────────────────────────────────

/**
 * Process a payment.captured event from Razorpay.
 */
async function handlePaymentCaptured(userId, orderId, paymentId, planId) {
  // If we have userId from notes, use it directly
  if (userId) {
    await db.runTransaction(async (tx) => {
      const txRef = await findTransactionByOrderIdRef(tx, userId, orderId);

      if (txRef) {
        tx.update(txRef, {
          status: 'captured',
          razorpay_payment_id: paymentId,
          updated_at: FieldValue.serverTimestamp(),
        });
      }

      if (planId && PLAN_PRICES[planId]) {
        await activateUserSubscriptionInTx(tx, userId, planId);
      }
    });
    return;
  }

  // Fallback: look up the order mapping
  const orderSnap = await db.collection('orders').doc(orderId).get();
  if (orderSnap.exists) {
    const orderData = orderSnap.data();
    const fallbackUserId = orderData.userId;
    const fallbackPlanId = orderData.planId;

    await db.runTransaction(async (tx) => {
      const txRef = await findTransactionByOrderIdRef(tx, fallbackUserId, orderId);

      if (txRef) {
        tx.update(txRef, {
          status: 'captured',
          razorpay_payment_id: paymentId,
          updated_at: FieldValue.serverTimestamp(),
        });
      }

      if (fallbackPlanId && PLAN_PRICES[fallbackPlanId]) {
        await activateUserSubscriptionInTx(tx, fallbackUserId, fallbackPlanId);
      }
    });
  }
}

/**
 * Mark a transaction as failed (non-transactional lookup).
 */
async function markTransactionFailed(userId, orderId, reason) {
  if (userId) {
    const query = db
      .collection('transactions')
      .doc(userId)
      .collection('payments')
      .where('razorpay_order_id', '==', orderId)
      .limit(1);

    const txSnap = await query.get();
    if (!txSnap.empty) {
      await txSnap.docs[0].ref.update({
        status: 'failed',
        failure_reason: reason,
        updated_at: FieldValue.serverTimestamp(),
      });
    }
    return;
  }

  // Fallback: use orders mapping
  const orderSnap = await db.collection('orders').doc(orderId).get();
  if (orderSnap.exists) {
    const fallbackUserId = orderSnap.data().userId;
    const fallbackQuery = db
      .collection('transactions')
      .doc(fallbackUserId)
      .collection('payments')
      .where('razorpay_order_id', '==', orderId)
      .limit(1);

    const txSnap = await fallbackQuery.get();
    if (!txSnap.empty) {
      await txSnap.docs[0].ref.update({
        status: 'failed',
        failure_reason: reason,
        updated_at: FieldValue.serverTimestamp(),
      });
    }
  }
}

/**
 * Demote a user to the free plan (subscription cancelled/expired).
 */
async function demoteUserToFree(uid) {
  await db.collection('users').doc(uid).update({
    plan_type: 'free',
    subscription_status: 'inactive',
    credits_remaining: PLAN_CREDITS.free,
    updated_at: FieldValue.serverTimestamp(),
  });
}

/**
 * Helper to activate user subscription inside a Firestore transaction.
 */
async function activateUserSubscriptionInTx(tx, uid, planId) {
  const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  tx.update(db.collection('users').doc(uid), {
    plan_type: planId,
    subscription_status: 'active',
    subscription_renewal_date: renewalDate,
    credits_remaining: PLAN_CREDITS[planId] || 300,
    updated_at: FieldValue.serverTimestamp(),
  });
}

// =============================================================================
// 5. adminTools — Callable Function
// =============================================================================
//
// Administrative CRUD operations on the tools collection.
// Requires the caller to have the `admin` custom claim set to true.
//
// Actions:
//   list   → returns all tools (ordered by created_at desc)
//   create → creates a new tool + tool_instructions doc
//   update → updates an existing tool + tool_instructions doc
//   delete → deletes a tool and its instructions

export const adminTools = onCall(
  {
    secrets: [AI_API_KEY, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET],
    region: 'asia-south1',
  },
  async (request) => {
    // ── Admin check via custom claims ──────────────────────────────────────
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    if (request.auth.token.admin !== true) {
      throw new HttpsError(
        'permission-denied',
        'Only administrators can perform this action.'
      );
    }

    const uid = request.auth.uid;
    const { action, toolData } = request.data || {};

    if (!action || typeof action !== 'string') {
      throw new HttpsError(
        'invalid-argument',
        'An "action" field is required (list, create, update, delete).'
      );
    }

    switch (action) {
      // ── List Tools ──────────────────────────────────────────────────────
      case 'list': {
        const toolsSnap = await db
          .collection('tools')
          .orderBy('created_at', 'desc')
          .get();

        const tools = toolsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return { tools };
      }

      // ── Create Tool ──────────────────────────────────────────────────────
      case 'create': {
        if (!toolData || !toolData.name || !toolData.slug) {
          throw new HttpsError(
            'invalid-argument',
            'toolData must include "name" and "slug".'
          );
        }

        const { system_instructions, ...toolFields } = toolData;

        // Create the tool document
        const toolRef = await db.collection('tools').add({
          ...toolFields,
          is_active: toolFields.is_active !== undefined ? toolFields.is_active : true,
          is_premium: toolFields.is_premium || false,
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        });

        // Save system instructions to the server-only collection
        if (system_instructions) {
          await db.collection('tool_instructions').doc(toolRef.id).set({
            system_instructions,
            updated_at: FieldValue.serverTimestamp(),
          });
        }

        logger.info(`Admin created tool: ${toolData.slug}`);
        return { success: true, toolId: toolRef.id };
      }

      // ── Update Tool ──────────────────────────────────────────────────────
      case 'update': {
        if (!toolData || !toolData.id) {
          throw new HttpsError(
            'invalid-argument',
            'toolData must include the document "id".'
          );
        }

        const { id, system_instructions, ...toolFields } = toolData;
        const toolRef = db.collection('tools').doc(id);

        // Check if the tool exists
        const existingTool = await toolRef.get();
        if (!existingTool.exists) {
          throw new HttpsError('not-found', `Tool with id "${id}" not found.`);
        }

        // Update tool metadata
        await toolRef.update({
          ...toolFields,
          updated_at: FieldValue.serverTimestamp(),
        });

        // Update system instructions if provided
        if (system_instructions !== undefined) {
          await db.collection('tool_instructions').doc(id).set(
            {
              system_instructions,
              updated_at: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }

        logger.info(`Admin updated tool: ${id}`);
        return { success: true };
      }

      // ── Delete Tool ──────────────────────────────────────────────────────
      case 'delete': {
        if (!toolData || !toolData.id) {
          throw new HttpsError(
            'invalid-argument',
            'toolData must include the document "id" to delete.'
          );
        }

        const { id } = toolData;

        // Delete the tool metadata
        await db.collection('tools').doc(id).delete();

        // Delete the system instructions
        await db.collection('tool_instructions').doc(id).delete();

        logger.info(`Admin deleted tool: ${id}`);
        return { success: true };
      }

      default:
        throw new HttpsError(
          'invalid-argument',
          `Unknown action "${action}". Valid actions: list, create, update, delete.`
        );
    }
  }
);

// =============================================================================
// 6. setUserClaims — Callable Function
// =============================================================================
//
// Allows an admin to set custom claims on a user (e.g., grant admin role).
// Uses Firebase Auth custom claims via admin.auth().setCustomUserClaims().

export const setUserClaims = onCall(
  {
    secrets: [AI_API_KEY, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET],
    region: 'asia-south1',
  },
  async (request) => {
    // ── Admin check via custom claims ──────────────────────────────────────
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    if (request.auth.token.admin !== true) {
      throw new HttpsError(
        'permission-denied',
        'Only administrators can set user claims.'
      );
    }

    const callerUid = request.auth.uid;
    const { uid: targetUid, claims } = request.data || {};

    // ── Validate input ─────────────────────────────────────────────────────
    if (!targetUid || typeof targetUid !== 'string') {
      throw new HttpsError(
        'invalid-argument',
        'A target user "uid" is required.'
      );
    }

    if (!claims || typeof claims !== 'object' || Array.isArray(claims)) {
      throw new HttpsError(
        'invalid-argument',
        'A "claims" object is required (e.g., { admin: true }).'
      );
    }

    // Prevent removing own admin access (safety check)
    if (targetUid === callerUid && claims.admin === false) {
      throw new HttpsError(
        'failed-precondition',
        'You cannot remove your own admin privileges.'
      );
    }

    // ── Set custom claims ──────────────────────────────────────────────────
    try {
      await auth.setCustomUserClaims(targetUid, claims);
    } catch (authError) {
      logger.error('Failed to set custom claims:', authError);
      throw new HttpsError(
        'internal',
        `Failed to set claims: ${authError.message || 'Unknown error'}`
      );
    }

    logger.info(`Admin set claims on user [REDACTED]:`, claims);

    return { success: true };
  }
);
