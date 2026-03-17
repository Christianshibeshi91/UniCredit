import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { config } from "dotenv";

config({ path: ".env.local" });

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Missing Firebase Admin credentials. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in .env.local"
  );
  process.exit(1);
}

const app = initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore(app);

// ── Product Definitions ───────────────────────────────────────────

interface SeedProduct {
  asin: string;
  title: string;
  brand: string;
  category: string;
  subcategory: string;
  price: number;
  rating: number;
  reviewCount: number;
  bsr: number;
  imageUrl: string;
  estimatedMonthlySales: number;
  profitMarginEstimate: number;
}

const products: SeedProduct[] = [
  // Kitchen Gadgets (4)
  {
    asin: "B0KITCHEN01",
    title: "ProChef 12-in-1 Immersion Blender Set",
    brand: "ProChef",
    category: "Kitchen Gadgets",
    subcategory: "Blenders",
    price: 49.99,
    rating: 3.8,
    reviewCount: 2847,
    bsr: 1245,
    imageUrl: "https://placehold.co/400x400/27272a/818cf8?text=Blender",
    estimatedMonthlySales: 3200,
    profitMarginEstimate: 0.35,
  },
  {
    asin: "B0KITCHEN02",
    title: "SmartScale Pro Digital Kitchen Scale with App",
    brand: "SmartScale",
    category: "Kitchen Gadgets",
    subcategory: "Scales",
    price: 34.99,
    rating: 4.1,
    reviewCount: 1523,
    bsr: 2890,
    imageUrl: "https://placehold.co/400x400/27272a/818cf8?text=Scale",
    estimatedMonthlySales: 1800,
    profitMarginEstimate: 0.42,
  },
  {
    asin: "B0KITCHEN03",
    title: "AirCrisp 5.8QT Digital Air Fryer",
    brand: "AirCrisp",
    category: "Kitchen Gadgets",
    subcategory: "Air Fryers",
    price: 89.99,
    rating: 4.3,
    reviewCount: 5621,
    bsr: 456,
    imageUrl: "https://placehold.co/400x400/27272a/818cf8?text=AirFryer",
    estimatedMonthlySales: 7500,
    profitMarginEstimate: 0.28,
  },
  {
    asin: "B0KITCHEN04",
    title: "FreshSeal Vacuum Food Storage System",
    brand: "FreshSeal",
    category: "Kitchen Gadgets",
    subcategory: "Food Storage",
    price: 59.99,
    rating: 3.5,
    reviewCount: 982,
    bsr: 4567,
    imageUrl: "https://placehold.co/400x400/27272a/818cf8?text=Vacuum",
    estimatedMonthlySales: 950,
    profitMarginEstimate: 0.45,
  },
  // Fitness Equipment (3)
  {
    asin: "B0FITNESS01",
    title: "FlexBand Pro Resistance Band Set (5-Pack)",
    brand: "FlexBand",
    category: "Fitness Equipment",
    subcategory: "Resistance Bands",
    price: 29.99,
    rating: 4.0,
    reviewCount: 8934,
    bsr: 312,
    imageUrl: "https://placehold.co/400x400/27272a/a78bfa?text=Bands",
    estimatedMonthlySales: 12000,
    profitMarginEstimate: 0.55,
  },
  {
    asin: "B0FITNESS02",
    title: "CoreWheel Ab Roller with Knee Pad",
    brand: "CoreWheel",
    category: "Fitness Equipment",
    subcategory: "Ab Rollers",
    price: 24.99,
    rating: 4.2,
    reviewCount: 3456,
    bsr: 1567,
    imageUrl: "https://placehold.co/400x400/27272a/a78bfa?text=AbRoller",
    estimatedMonthlySales: 4200,
    profitMarginEstimate: 0.52,
  },
  {
    asin: "B0FITNESS03",
    title: "GripForce Adjustable Hand Grip Strengthener",
    brand: "GripForce",
    category: "Fitness Equipment",
    subcategory: "Hand Grips",
    price: 19.99,
    rating: 3.6,
    reviewCount: 2134,
    bsr: 3456,
    imageUrl: "https://placehold.co/400x400/27272a/a78bfa?text=Grip",
    estimatedMonthlySales: 2800,
    profitMarginEstimate: 0.6,
  },
  // Pet Supplies (3)
  {
    asin: "B0PETSUP01",
    title: "AquaPaws Automatic Pet Water Fountain 2L",
    brand: "AquaPaws",
    category: "Pet Supplies",
    subcategory: "Water Fountains",
    price: 39.99,
    rating: 3.9,
    reviewCount: 4567,
    bsr: 789,
    imageUrl: "https://placehold.co/400x400/27272a/22d3ee?text=Fountain",
    estimatedMonthlySales: 5800,
    profitMarginEstimate: 0.38,
  },
  {
    asin: "B0PETSUP02",
    title: "SnugNest Orthopedic Dog Bed — Large",
    brand: "SnugNest",
    category: "Pet Supplies",
    subcategory: "Dog Beds",
    price: 54.99,
    rating: 4.4,
    reviewCount: 6789,
    bsr: 234,
    imageUrl: "https://placehold.co/400x400/27272a/22d3ee?text=DogBed",
    estimatedMonthlySales: 9200,
    profitMarginEstimate: 0.32,
  },
  {
    asin: "B0PETSUP03",
    title: "FurGroom Self-Cleaning Slicker Brush",
    brand: "FurGroom",
    category: "Pet Supplies",
    subcategory: "Grooming",
    price: 16.99,
    rating: 4.1,
    reviewCount: 3210,
    bsr: 1890,
    imageUrl: "https://placehold.co/400x400/27272a/22d3ee?text=Brush",
    estimatedMonthlySales: 6400,
    profitMarginEstimate: 0.58,
  },
];

// ── Review Templates ──────────────────────────────────────────────

const positiveReviews = [
  { title: "Exceeded my expectations!", body: "I was skeptical at first but this product really delivers. Build quality is solid and it works exactly as described. Would recommend to anyone looking for a reliable option in this category.", rating: 5 },
  { title: "Great value for the price", body: "You get a lot for what you pay. Compared to more expensive alternatives, this holds up really well. The materials feel durable and it's easy to use right out of the box.", rating: 5 },
  { title: "Solid purchase", body: "Does what it says it does. No complaints here. Setup was straightforward and it's been working well for the past few weeks. Happy with my purchase.", rating: 4 },
  { title: "Better than expected", body: "I've tried similar products from other brands and this one is noticeably better. The design is thoughtful and you can tell they put effort into the small details.", rating: 5 },
  { title: "Really enjoying this", body: "Been using it daily for about a month now. Still works great, no issues. It's become part of my routine and I can't imagine going back to what I had before.", rating: 4 },
  { title: "Perfect gift idea", body: "Bought this as a gift and they absolutely loved it. Packaging was nice too. Will definitely buy again for other family members.", rating: 5 },
  { title: "Works as advertised", body: "Simple, effective, and well-made. Sometimes that's all you need. I appreciate that the instructions were clear and it was ready to use within minutes.", rating: 4 },
  { title: "Impressed with quality", body: "For this price point I wasn't expecting much, but the quality is genuinely impressive. Feels like it could easily cost twice as much.", rating: 5 },
];

const negativeReviews = [
  { title: "Broke after 2 weeks", body: "Was working fine initially but completely stopped functioning after just two weeks of normal use. Very disappointed. The build quality is clearly not meant to last. I expected much better for this price.", rating: 1 },
  { title: "Cheaply made", body: "The materials feel flimsy and low quality. Plastic parts are thin and I can already see wear after just a few uses. The product photos are misleading — it looks much better online than in person.", rating: 2 },
  { title: "Not worth the money", body: "Overpriced for what you get. I found cheaper alternatives that work just as well or better. The brand markup isn't justified by the product quality.", rating: 2 },
  { title: "Arrived damaged", body: "Packaging was minimal and the product arrived with visible damage. The box was crushed and the product had scratches. Returning for a refund.", rating: 1 },
  { title: "Misleading description", body: "The product description says one thing but the actual product is different. Size is smaller than shown, features don't match what's listed. Feels like false advertising.", rating: 1 },
  { title: "Terrible customer service", body: "Product had issues right out of the box. Tried to contact the seller for a replacement and got no response for over a week. Finally got a generic reply that didn't address my concerns at all.", rating: 1 },
  { title: "Loud and annoying", body: "Makes way more noise than expected. It's distracting and uncomfortable to use. The motor or mechanism inside sounds like it's struggling. Not something I'd use regularly.", rating: 2 },
  { title: "Design flaws", body: "The overall concept is good but the execution has some obvious design flaws. The handle is uncomfortable to grip, the buttons are hard to press, and the cord is way too short.", rating: 2 },
];

const mixedReviews = [
  { title: "Decent but has issues", body: "Works okay for basic use but don't expect anything premium. The core functionality is fine but there are rough edges that show this is a budget product. If they fixed the minor issues it'd be great.", rating: 3 },
  { title: "Good product, bad instructions", body: "The product itself is fine once you figure out how to use it, but the instruction manual is terrible. Took me an hour of trial and error. They need to invest in better documentation.", rating: 3 },
  { title: "Average at best", body: "It's fine. Nothing special, nothing terrible. Does the job but doesn't excel at anything. If you need something basic and don't want to spend a lot, it'll work.", rating: 3 },
  { title: "Hit or miss quality control", body: "My first unit had defects but the replacement was perfect. Seems like quality control is inconsistent. When it works, it's great. Just make sure you inspect it carefully when it arrives.", rating: 3 },
  { title: "Good features, poor build", body: "Love the feature set and the design concept. Unfortunately the build quality doesn't match the ambition. If they used better materials this would easily be a 5-star product.", rating: 3 },
  { title: "Needs improvement", body: "The product works for its intended purpose but there's a lot of room for improvement. I wish the battery lasted longer, the noise level was lower, and the overall fit and finish was better.", rating: 3 },
  { title: "Second time buyer — better this time", body: "Bought the previous version and it was terrible. This new version is much improved — they clearly listened to feedback. Still not perfect but heading in the right direction.", rating: 4 },
  { title: "Does the job, nothing more", body: "It's functional. That's about the best I can say. Not exciting, not terrible. If you need basic functionality without bells and whistles, this will work.", rating: 3 },
];

const categorySpecificComplaints: Record<string, Array<{ title: string; body: string; rating: number }>> = {
  "Kitchen Gadgets": [
    { title: "Hard to clean", body: "Food gets stuck in crevices that are impossible to reach. Even after soaking and scrubbing, there's always residue left behind. Not dishwasher safe despite what the listing implies. This is a deal breaker for daily kitchen use.", rating: 2 },
    { title: "Motor overheats", body: "After about 5 minutes of continuous use, the motor gets extremely hot to the touch. Had to take breaks during food prep. Worrying from a safety standpoint. Not suitable for heavy-duty tasks.", rating: 2 },
    { title: "Cord too short", body: "The power cord is only about 2 feet long. My outlets aren't right next to my counter so I need an extension cord every time. Such a simple thing to get right — why is the cord so short?", rating: 2 },
    { title: "Measurements inaccurate", body: "Compared to my calibrated scale, this is off by 5-10% consistently. For baking where precision matters, this is useless. Had to recalibrate multiple times but it still drifts.", rating: 1 },
    { title: "Suction cups don't hold", body: "The suction cup feet are supposed to keep it stable during use but they don't stick to my countertop at all. The whole unit slides around. Dangerous when using sharp attachments.", rating: 2 },
    { title: "Plastic tastes weird", body: "There's a noticeable plastic taste in food prepared with this. Even after washing multiple times, the taste persists. Concerned about chemical leaching. Not something I want near my food.", rating: 1 },
  ],
  "Fitness Equipment": [
    { title: "Bands snap easily", body: "Two of the five bands snapped within the first month. Was doing normal exercises, nothing extreme. The rubber quality is poor — you can see tiny cracks forming before they break. Dangerous.", rating: 1 },
    { title: "Handles uncomfortable", body: "The foam handles start to deteriorate quickly and bits of foam come off on your hands. After a few sweaty sessions, the grip becomes slippery. Need to wrap them with tape to use safely.", rating: 2 },
    { title: "Inaccurate resistance levels", body: "The listed resistance levels don't match reality. The 'heavy' band feels like medium at best. If you're serious about progressive overload, you can't trust these ratings at all.", rating: 2 },
    { title: "Rolling wheel wobbles", body: "The ab roller wheel has a noticeable wobble that gets worse over time. Makes the exercise feel unstable and puts strain on the wrists. The axle seems to be slightly bent from the factory.", rating: 2 },
    { title: "No-slip surface wears off", body: "The textured grip surface wore smooth after about two weeks of daily use. Now it's actually more slippery than a smooth surface would be. They clearly used a cheap coating.", rating: 2 },
    { title: "Knee pad too thin", body: "The included knee pad is basically just a sheet of foam. Provides zero cushioning on hard floors. Had to buy a separate pad, which defeats the purpose of the 'included' accessory.", rating: 2 },
  ],
  "Pet Supplies": [
    { title: "Pump stopped working", body: "The water pump died after 3 weeks. My cat relies on this for water so I had to rush to get a replacement. A water fountain failing is a bigger deal than most products — it affects pet health directly.", rating: 1 },
    { title: "Filter clogs constantly", body: "The replaceable filter gets clogged within days, not weeks like advertised. And the replacement filters are expensive. Feels like a money trap — cheap product, expensive consumables.", rating: 2 },
    { title: "Dog destroyed it in hours", body: "My lab had this bed torn apart in under 3 hours. The outer fabric has zero durability against even moderate chewing. If you have any dog that's not completely docile, skip this.", rating: 1 },
    { title: "Filling goes flat quickly", body: "The memory foam filling compressed and went completely flat within a month. Now it's just a flat sheet of fabric on the floor. My senior dog needs actual support and this provides none anymore.", rating: 2 },
    { title: "Bristles fall out", body: "Bristles started falling out during the first grooming session. Found them embedded in my dog's fur. This is a safety hazard — my dog could swallow loose bristles. Threw it away immediately.", rating: 1 },
    { title: "Too noisy for pets", body: "The motor hum is loud enough to scare my cat away from the fountain. She refuses to drink from it. The whole point is to encourage water intake and the noise does the opposite.", rating: 2 },
  ],
};

// ── Review Generator ──────────────────────────────────────────────

function generateReviews(product: SeedProduct): Array<Record<string, unknown>> {
  const reviews: Array<Record<string, unknown>> = [];
  const complaints = categorySpecificComplaints[product.category] ?? [];

  // Distribution: ~8 positive, ~6 negative, ~6 mixed, ~4 category-specific, ~6 more varied
  const templates = [
    ...positiveReviews.slice(0, 8),
    ...negativeReviews.slice(0, 6),
    ...mixedReviews.slice(0, 6),
    ...complaints.slice(0, 4),
    // Fill remaining with varied picks
    positiveReviews[Math.floor(Math.random() * positiveReviews.length)],
    negativeReviews[Math.floor(Math.random() * negativeReviews.length)],
    mixedReviews[Math.floor(Math.random() * mixedReviews.length)],
    complaints[Math.floor(Math.random() * complaints.length)] ?? mixedReviews[0],
    positiveReviews[Math.floor(Math.random() * positiveReviews.length)],
    negativeReviews[Math.floor(Math.random() * negativeReviews.length)],
  ];

  for (let i = 0; i < 30; i++) {
    const template = templates[i % templates.length];
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() - Math.floor(Math.random() * 365));

    reviews.push({
      id: `${product.asin}_R${String(i + 1).padStart(3, "0")}`,
      productId: product.asin,
      reviewerName: `Reviewer_${Math.random().toString(36).slice(2, 8)}`,
      rating: template.rating,
      title: template.title,
      body: template.body,
      verifiedPurchase: Math.random() > 0.2,
      helpfulVotes: Math.floor(Math.random() * 50),
      reviewDate: Timestamp.fromDate(reviewDate),
      createdAt: Timestamp.now(),
    });
  }

  return reviews;
}

// ── Seed Runner ───────────────────────────────────────────────────

async function seed() {
  console.log("Seeding Firestore...\n");

  const batch = db.batch();
  let docCount = 0;

  for (const product of products) {
    const productDoc = {
      id: product.asin,
      asin: product.asin,
      title: product.title,
      brand: product.brand,
      category: product.category,
      subcategory: product.subcategory,
      price: product.price,
      rating: product.rating,
      reviewCount: product.reviewCount,
      bsr: product.bsr,
      imageUrl: product.imageUrl,
      productUrl: `https://amazon.com/dp/${product.asin}`,
      estimatedMonthlySales: product.estimatedMonthlySales,
      estimatedMonthlyRevenue: Math.round(product.price * product.estimatedMonthlySales),
      profitMarginEstimate: product.profitMarginEstimate,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    batch.set(db.collection("products").doc(product.asin), productDoc);
    docCount++;
    console.log(`  + Product: ${product.title} (${product.asin})`);

    const reviews = generateReviews(product);
    for (const review of reviews) {
      batch.set(
        db.collection("reviews").doc(review.id as string),
        review
      );
      docCount++;
    }
    console.log(`    + ${reviews.length} reviews`);
  }

  console.log(`\nCommitting batch write (${docCount} documents)...`);
  await batch.commit();
  console.log("Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
