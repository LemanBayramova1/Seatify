import { loadStripe } from "@stripe/stripe-js";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Only touch Stripe.js at all if a real test-mode key is configured — the
// demo works fully (mock payment form) without one.
export const stripePromise = publishableKey ? loadStripe(publishableKey) : null;
export const hasStripeKey = Boolean(publishableKey);
