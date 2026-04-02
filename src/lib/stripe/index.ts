import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});

/** Create a Stripe customer for a guest registering for an event */
export async function createCustomer(email: string, name: string, metadata?: Record<string, string>) {
  return stripe.customers.create({
    email,
    name,
    metadata,
  });
}

/** Attach a payment method to a customer and set as default */
export async function attachPaymentMethod(customerId: string, paymentMethodId: string) {
  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
}

/** Create a SetupIntent for collecting card details at registration */
export async function createSetupIntent(customerId: string) {
  return stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
  });
}

/** Create a PaymentIntent for charging a guest's card on file */
export async function createPaymentIntent(
  customerId: string,
  amount: number,
  paymentMethodId: string,
  metadata?: Record<string, string>
) {
  return stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    customer: customerId,
    payment_method: paymentMethodId,
    off_session: true,
    confirm: true,
    metadata,
  });
}

/** Create a payment intent that requires confirmation (for manual capture) */
export async function createHoldIntent(
  customerId: string,
  amount: number,
  paymentMethodId: string,
  metadata?: Record<string, string>
) {
  return stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    customer: customerId,
    payment_method: paymentMethodId,
    capture_method: 'manual',
    confirm: true,
    off_session: true,
    metadata,
  });
}

/** Capture a previously held payment */
export async function capturePayment(paymentIntentId: string, amount?: number) {
  return stripe.paymentIntents.capture(paymentIntentId, {
    ...(amount ? { amount_to_capture: amount } : {}),
  });
}

/** Refund a payment */
export async function refundPayment(paymentIntentId: string, amount?: number) {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amount ? { amount } : {}),
  });
}

/** Create a Stripe Connect account for an organization */
export async function createConnectAccount(orgName: string, email: string) {
  return stripe.accounts.create({
    type: 'standard',
    business_profile: { name: orgName },
    email,
  });
}
