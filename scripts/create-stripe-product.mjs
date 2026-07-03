import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error("STRIPE_SECRET_KEY is required. Get it from the Stripe Dashboard.");
  process.exit(1);
}

const stripe = new Stripe(secretKey);

const product = await stripe.products.create({
  name: "Siggy Lifetime Access",
  description:
    "Lifetime access to Siggy templates, fonts, colors, headshots, and watermark removal.",
  default_price_data: {
    currency: "usd",
    unit_amount: 1900,
  },
});

const defaultPrice =
  typeof product.default_price === "string" ? product.default_price : product.default_price?.id;

if (!defaultPrice) {
  console.error("Stripe created the product but did not return a default price ID.");
  process.exit(1);
}

console.log("Stripe product created. Store these values in .env.local and Vercel:");
console.log(`STRIPE_PRODUCT_ID=${product.id}`);
console.log(`STRIPE_PRICE_ID=${defaultPrice}`);
