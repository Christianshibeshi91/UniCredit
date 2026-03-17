/**
 * Mock data for UI prototype — no Firebase required.
 * Provides realistic Amazon product research data.
 *
 * Contains 16 hand-crafted products + 10,000 deterministically generated products.
 */

import type { AnalysisResult } from "@/lib/types";
import type { TableProduct } from "@/components/dashboard/OpportunityTable";
import type { Tier, Recommendation, ScoreBreakdown } from "@/lib/types";

// ── Products ──────────────────────────────────────────────────────

export interface MockProduct {
  id: string;
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
  estimatedMonthlyRevenue: number;
  profitMarginEstimate: number;
  opportunityScore: number | null;
  tier: Tier | null;
  recommendation: Recommendation | null;
  scoreBreakdown: ScoreBreakdown | null;
  analysisStatus: "pending" | "processing" | "complete" | "failed" | null;
}

// ── Hand-crafted products (original 16) ───────────────────────────

const HAND_CRAFTED: MockProduct[] = [
  {
    id: "B09V3KXJPB",
    asin: "B09V3KXJPB",
    title: "Premium Stainless Steel Garlic Press — Heavy Duty Crusher with Ergonomic Handle",
    brand: "KitchenPro",
    category: "Kitchen Gadgets",
    subcategory: "Garlic Tools",
    price: 14.97,
    rating: 4.1,
    reviewCount: 8432,
    bsr: 342,
    imageUrl: "",
    estimatedMonthlySales: 6200,
    estimatedMonthlyRevenue: 92814,
    profitMarginEstimate: 0.42,
    opportunityScore: 87,
    tier: "A",
    recommendation: "buy",
    scoreBreakdown: { demandScore: 22, competitionScore: 23, marginScore: 21, sentimentScore: 21 },
    analysisStatus: "complete",
  },
  {
    id: "B0BFWK4TMR",
    asin: "B0BFWK4TMR",
    title: "Adjustable Dumbbell Set 5-52.5 lbs — Space-Saving Home Gym Equipment",
    brand: "FitForge",
    category: "Fitness Equipment",
    subcategory: "Dumbbells",
    price: 149.99,
    rating: 3.8,
    reviewCount: 12780,
    bsr: 189,
    imageUrl: "",
    estimatedMonthlySales: 4300,
    estimatedMonthlyRevenue: 644957,
    profitMarginEstimate: 0.28,
    opportunityScore: 92,
    tier: "S",
    recommendation: "strong_buy",
    scoreBreakdown: { demandScore: 25, competitionScore: 24, marginScore: 20, sentimentScore: 23 },
    analysisStatus: "complete",
  },
  {
    id: "B07N4M94FK",
    asin: "B07N4M94FK",
    title: "Self-Cleaning Slicker Brush for Dogs & Cats — Removes Tangles, Loose Fur",
    brand: "PawPerfect",
    category: "Pet Supplies",
    subcategory: "Grooming",
    price: 12.99,
    rating: 4.4,
    reviewCount: 23100,
    bsr: 87,
    imageUrl: "",
    estimatedMonthlySales: 15200,
    estimatedMonthlyRevenue: 197448,
    profitMarginEstimate: 0.55,
    opportunityScore: 78,
    tier: "A",
    recommendation: "buy",
    scoreBreakdown: { demandScore: 25, competitionScore: 15, marginScore: 22, sentimentScore: 16 },
    analysisStatus: "complete",
  },
  {
    id: "B0CG7K5HN9",
    asin: "B0CG7K5HN9",
    title: "Electric Milk Frother Handheld — USB Rechargeable Foam Maker for Coffee & Lattes",
    brand: "BrewBliss",
    category: "Kitchen Gadgets",
    subcategory: "Coffee Accessories",
    price: 19.99,
    rating: 4.3,
    reviewCount: 5670,
    bsr: 521,
    imageUrl: "",
    estimatedMonthlySales: 3800,
    estimatedMonthlyRevenue: 75962,
    profitMarginEstimate: 0.48,
    opportunityScore: 71,
    tier: "B",
    recommendation: "watch",
    scoreBreakdown: { demandScore: 18, competitionScore: 17, marginScore: 20, sentimentScore: 16 },
    analysisStatus: "complete",
  },
  {
    id: "B08QRYTPGH",
    asin: "B08QRYTPGH",
    title: "Resistance Bands Set with Handles — 5 Tube Exercise Bands for Home Workout",
    brand: "FlexFit",
    category: "Fitness Equipment",
    subcategory: "Resistance Bands",
    price: 29.99,
    rating: 4.0,
    reviewCount: 18400,
    bsr: 156,
    imageUrl: "",
    estimatedMonthlySales: 8900,
    estimatedMonthlyRevenue: 266911,
    profitMarginEstimate: 0.52,
    opportunityScore: 83,
    tier: "A",
    recommendation: "buy",
    scoreBreakdown: { demandScore: 25, competitionScore: 20, marginScore: 22, sentimentScore: 16 },
    analysisStatus: "complete",
  },
  {
    id: "B0D7XKPWL2",
    asin: "B0D7XKPWL2",
    title: "Automatic Pet Water Fountain — 2.5L Stainless Steel with Triple Filtration",
    brand: "AquaPaws",
    category: "Pet Supplies",
    subcategory: "Water Fountains",
    price: 34.99,
    rating: 3.6,
    reviewCount: 3420,
    bsr: 1230,
    imageUrl: "",
    estimatedMonthlySales: 1800,
    estimatedMonthlyRevenue: 62982,
    profitMarginEstimate: 0.38,
    opportunityScore: 95,
    tier: "S",
    recommendation: "strong_buy",
    scoreBreakdown: { demandScore: 15, competitionScore: 25, marginScore: 23, sentimentScore: 22 },
    analysisStatus: "complete",
  },
  {
    id: "B09HJKLM5Q",
    asin: "B09HJKLM5Q",
    title: "Silicone Kitchen Utensil Set — 12-Piece Heat Resistant Cooking Tools",
    brand: "ChefZen",
    category: "Kitchen Gadgets",
    subcategory: "Utensil Sets",
    price: 24.99,
    rating: 4.5,
    reviewCount: 9800,
    bsr: 267,
    imageUrl: "",
    estimatedMonthlySales: 7100,
    estimatedMonthlyRevenue: 177429,
    profitMarginEstimate: 0.45,
    opportunityScore: 55,
    tier: "B",
    recommendation: "watch",
    scoreBreakdown: { demandScore: 22, competitionScore: 10, marginScore: 14, sentimentScore: 9 },
    analysisStatus: "complete",
  },
  {
    id: "B0BNMF2KPL",
    asin: "B0BNMF2KPL",
    title: "Yoga Mat 6mm Extra Thick — Non-Slip Exercise Mat with Carrying Strap",
    brand: "ZenFlow",
    category: "Fitness Equipment",
    subcategory: "Yoga Mats",
    price: 26.99,
    rating: 4.2,
    reviewCount: 14200,
    bsr: 203,
    imageUrl: "",
    estimatedMonthlySales: 5600,
    estimatedMonthlyRevenue: 151144,
    profitMarginEstimate: 0.40,
    opportunityScore: 62,
    tier: "B",
    recommendation: "watch",
    scoreBreakdown: { demandScore: 24, competitionScore: 12, marginScore: 15, sentimentScore: 11 },
    analysisStatus: "complete",
  },
  {
    id: "B0CPQF8WK7",
    asin: "B0CPQF8WK7",
    title: "Interactive Dog Puzzle Toy — Slow Feeder Treat Dispenser for Boredom",
    brand: "BrainPup",
    category: "Pet Supplies",
    subcategory: "Interactive Toys",
    price: 18.99,
    rating: 3.9,
    reviewCount: 6780,
    bsr: 890,
    imageUrl: "",
    estimatedMonthlySales: 2400,
    estimatedMonthlyRevenue: 45576,
    profitMarginEstimate: 0.50,
    opportunityScore: 74,
    tier: "B",
    recommendation: "watch",
    scoreBreakdown: { demandScore: 16, competitionScore: 19, marginScore: 21, sentimentScore: 18 },
    analysisStatus: "complete",
  },
  {
    id: "B0A3NKV2X1",
    asin: "B0A3NKV2X1",
    title: "Digital Kitchen Scale — 0.1g Precision Food Scale with Tare Function",
    brand: "WeighSmart",
    category: "Kitchen Gadgets",
    subcategory: "Scales",
    price: 11.99,
    rating: 4.6,
    reviewCount: 31200,
    bsr: 45,
    imageUrl: "",
    estimatedMonthlySales: 22000,
    estimatedMonthlyRevenue: 263780,
    profitMarginEstimate: 0.35,
    opportunityScore: 38,
    tier: "C",
    recommendation: "avoid",
    scoreBreakdown: { demandScore: 25, competitionScore: 5, marginScore: 8, sentimentScore: 0 },
    analysisStatus: "complete",
  },
  {
    id: "B0DKFM47LW",
    asin: "B0DKFM47LW",
    title: "Jump Rope Speed Cable — Weighted Handle Ball Bearing Skipping Rope",
    brand: "RopeKing",
    category: "Fitness Equipment",
    subcategory: "Jump Ropes",
    price: 15.99,
    rating: 3.7,
    reviewCount: 4120,
    bsr: 1670,
    imageUrl: "",
    estimatedMonthlySales: 1200,
    estimatedMonthlyRevenue: 19188,
    profitMarginEstimate: 0.58,
    opportunityScore: 69,
    tier: "B",
    recommendation: "watch",
    scoreBreakdown: { demandScore: 12, competitionScore: 18, marginScore: 23, sentimentScore: 16 },
    analysisStatus: "complete",
  },
  {
    id: "B0EFPQ7R4K",
    asin: "B0EFPQ7R4K",
    title: "Cat Scratching Post Tower — 3-Tier Sisal Rope with Dangling Ball Toys",
    brand: "WhiskerWorld",
    category: "Pet Supplies",
    subcategory: "Scratching Posts",
    price: 42.99,
    rating: 3.5,
    reviewCount: 2100,
    bsr: 2340,
    imageUrl: "",
    estimatedMonthlySales: 890,
    estimatedMonthlyRevenue: 38261,
    profitMarginEstimate: 0.32,
    opportunityScore: 82,
    tier: "A",
    recommendation: "buy",
    scoreBreakdown: { demandScore: 10, competitionScore: 24, marginScore: 18, sentimentScore: 20 },
    analysisStatus: "complete",
  },
  {
    id: "B0GQRT5NW8",
    asin: "B0GQRT5NW8",
    title: "Vegetable Chopper Pro — 14-in-1 Onion Dicer with 8 Blades & Container",
    brand: "ChopMaster",
    category: "Kitchen Gadgets",
    subcategory: "Choppers & Dicers",
    price: 22.99,
    rating: 3.4,
    reviewCount: 15600,
    bsr: 178,
    imageUrl: "",
    estimatedMonthlySales: 9200,
    estimatedMonthlyRevenue: 211508,
    profitMarginEstimate: 0.44,
    opportunityScore: 91,
    tier: "S",
    recommendation: "strong_buy",
    scoreBreakdown: { demandScore: 25, competitionScore: 23, marginScore: 21, sentimentScore: 22 },
    analysisStatus: "complete",
  },
  {
    id: "B0HK2ML9R3",
    asin: "B0HK2ML9R3",
    title: "Foam Roller 18\" Medium Density — Deep Tissue Massage for Muscle Recovery",
    brand: "RecoverPro",
    category: "Fitness Equipment",
    subcategory: "Foam Rollers",
    price: 19.99,
    rating: 4.3,
    reviewCount: 7800,
    bsr: 445,
    imageUrl: "",
    estimatedMonthlySales: 4100,
    estimatedMonthlyRevenue: 81959,
    profitMarginEstimate: 0.46,
    opportunityScore: 47,
    tier: "C",
    recommendation: "avoid",
    scoreBreakdown: { demandScore: 19, competitionScore: 8, marginScore: 12, sentimentScore: 8 },
    analysisStatus: "complete",
  },
  {
    id: "B0JNP3Q8VZ",
    asin: "B0JNP3Q8VZ",
    title: "Elevated Dog Bowl Stand — Bamboo Raised Feeder with 2 Stainless Steel Bowls",
    brand: "NaturPaws",
    category: "Pet Supplies",
    subcategory: "Feeding Supplies",
    price: 27.99,
    rating: 4.0,
    reviewCount: 3950,
    bsr: 1120,
    imageUrl: "",
    estimatedMonthlySales: 1600,
    estimatedMonthlyRevenue: 44784,
    profitMarginEstimate: 0.41,
    opportunityScore: 58,
    tier: "B",
    recommendation: "watch",
    scoreBreakdown: { demandScore: 13, competitionScore: 15, marginScore: 16, sentimentScore: 14 },
    analysisStatus: "complete",
  },
  {
    id: "B0KQWS6P1M",
    asin: "B0KQWS6P1M",
    title: "Immersion Hand Blender — 5-Speed Stick Blender with Whisk & Chopper Attachments",
    brand: "BlendForce",
    category: "Kitchen Gadgets",
    subcategory: "Blenders",
    price: 34.99,
    rating: 3.3,
    reviewCount: 4890,
    bsr: 890,
    imageUrl: "",
    estimatedMonthlySales: 2100,
    estimatedMonthlyRevenue: 73479,
    profitMarginEstimate: 0.36,
    opportunityScore: 86,
    tier: "A",
    recommendation: "buy",
    scoreBreakdown: { demandScore: 16, competitionScore: 25, marginScore: 20, sentimentScore: 25 },
    analysisStatus: "complete",
  },
];

// ── Deterministic product generator ───────────────────────────────

/** Mulberry32 PRNG — deterministic 32-bit seeded random */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface CategoryDef {
  category: string;
  subcategories: { name: string; products: ProductTemplate[] }[];
  priceRange: [number, number];
  marginRange: [number, number];
}

interface ProductTemplate {
  titleTemplate: string;
  brandPool: string[];
}

const CATEGORY_DEFS: CategoryDef[] = [
  {
    category: "Kitchen Gadgets",
    priceRange: [8.99, 59.99],
    marginRange: [0.30, 0.60],
    subcategories: [
      {
        name: "Garlic Tools",
        products: [
          { titleTemplate: "Stainless Steel Garlic Rocker — Crusher Mincer with Silicone Peeler", brandPool: ["KitchenPro", "ChefZen", "CookCraft", "HomeChef", "PrepStation"] },
          { titleTemplate: "Garlic Press with Cleaning Brush — Zinc Alloy Heavy-Duty Mincer", brandPool: ["GourmetEdge", "ChopMaster", "MealPrep", "CulinaryPro", "DineWell"] },
        ],
      },
      {
        name: "Coffee Accessories",
        products: [
          { titleTemplate: "Pour Over Coffee Dripper — Stainless Steel Reusable Filter Cone", brandPool: ["BrewBliss", "CafeCraft", "BeanBoss", "MorningPeak", "RoastMaster"] },
          { titleTemplate: "Manual Coffee Grinder — Ceramic Burr Hand Mill with Adjustable Settings", brandPool: ["GrindWorks", "BrewBliss", "BeanBoss", "CafeCraft", "AromaPro"] },
          { titleTemplate: "Cold Brew Coffee Maker — 1.5L Glass Pitcher with Fine Mesh Filter", brandPool: ["CafeCraft", "BrewBliss", "ChillBrew", "MorningPeak", "BeanBoss"] },
        ],
      },
      {
        name: "Utensil Sets",
        products: [
          { titleTemplate: "Bamboo Cooking Utensil Set — 6-Piece Wooden Spoons & Spatulas", brandPool: ["EcoKitchen", "ChefZen", "NaturCook", "GreenHome", "WoodCraft"] },
          { titleTemplate: "Nylon Kitchen Utensil Set — 10-Piece Non-Scratch Cooking Tools", brandPool: ["HomeChef", "CookCraft", "PrepStation", "MealMaster", "ChefZen"] },
        ],
      },
      {
        name: "Scales",
        products: [
          { titleTemplate: "Coffee Scale with Timer — 0.1g Precision Drip Station Scale", brandPool: ["WeighSmart", "ScalePro", "PrecisionPlus", "BrewBliss", "GramMaster"] },
          { titleTemplate: "Nutritional Kitchen Scale — Calorie Counting with Database", brandPool: ["WeighSmart", "HealthScale", "FitKitchen", "NutriWeigh", "SmartMeasure"] },
        ],
      },
      {
        name: "Choppers & Dicers",
        products: [
          { titleTemplate: "Mandoline Slicer with Guard — Adjustable Thickness Vegetable Cutter", brandPool: ["ChopMaster", "SlicePro", "PrepStation", "CookCraft", "KitchenPro"] },
          { titleTemplate: "Herb Scissors 5-Blade — Stainless Steel Kitchen Shears with Cover", brandPool: ["HerbCut", "ChefZen", "GourmetEdge", "CulinaryPro", "GreenChop"] },
        ],
      },
      {
        name: "Blenders",
        products: [
          { titleTemplate: "Personal Blender 20oz — USB-C Rechargeable Portable Smoothie Maker", brandPool: ["BlendForce", "SmoothGo", "VitaBlend", "NutriPulse", "FreshBlend"] },
          { titleTemplate: "Countertop Blender 64oz — 1200W Professional with Variable Speed", brandPool: ["BlendForce", "PowerPulse", "VitaBlend", "MixMaster", "CrushPro"] },
        ],
      },
      {
        name: "Food Storage",
        products: [
          { titleTemplate: "Glass Meal Prep Containers — 10-Pack with Snap-Lock Lids", brandPool: ["FreshSeal", "PrepStation", "GlassLock", "MealReady", "StoreSmart"] },
          { titleTemplate: "Vacuum Seal Bags for Food Saver — 100 Pre-Cut Quart Size Bags", brandPool: ["SealFresh", "VacuPack", "FreshKeep", "AirTight", "StoreSmart"] },
          { titleTemplate: "Silicone Stretch Lids — 12-Pack Reusable Bowl Covers BPA-Free", brandPool: ["EcoKitchen", "FlexiSeal", "GreenHome", "FreshSeal", "ReusePro"] },
        ],
      },
      {
        name: "Thermometers",
        products: [
          { titleTemplate: "Instant Read Meat Thermometer — Digital Probe with Backlit Display", brandPool: ["TempPro", "GrillSmart", "CookCraft", "MeatMaster", "PrecisionPlus"] },
          { titleTemplate: "Wireless Meat Thermometer — Bluetooth Dual Probe for Smoker & Oven", brandPool: ["TempPro", "SmokeTech", "GrillSmart", "BBQMonitor", "HeatTrack"] },
        ],
      },
      {
        name: "Baking Tools",
        products: [
          { titleTemplate: "Silicone Baking Mat Set — Non-Stick Half Sheet Size 2-Pack", brandPool: ["BakePro", "SiliBake", "OvenCraft", "BakeRight", "PastryPerfect"] },
          { titleTemplate: "Rolling Pin with Thickness Rings — Adjustable Stainless Steel", brandPool: ["BakePro", "PastryPerfect", "DoughMaster", "RollRight", "OvenCraft"] },
          { titleTemplate: "Piping Tips Set — 48-Piece Cake Decorating Kit with Coupler", brandPool: ["CakeCraft", "PastryPerfect", "SweetDecor", "IcingPro", "BakeArt"] },
        ],
      },
    ],
  },
  {
    category: "Fitness Equipment",
    priceRange: [12.99, 199.99],
    marginRange: [0.20, 0.55],
    subcategories: [
      {
        name: "Dumbbells",
        products: [
          { titleTemplate: "Neoprene Dumbbell Set — Color-Coded 3-Pair Rack (3, 5, 8 lbs)", brandPool: ["FitForge", "IronGrip", "LiftPro", "GymCore", "PowerHouse"] },
          { titleTemplate: "Hex Rubber Dumbbells — Anti-Roll Design Sold in Pairs", brandPool: ["FitForge", "IronGrip", "HexMax", "GymCore", "SteelFlex"] },
        ],
      },
      {
        name: "Resistance Bands",
        products: [
          { titleTemplate: "Fabric Resistance Bands — Set of 5 Non-Slip Booty Bands", brandPool: ["FlexFit", "BootyBand", "GlutePro", "ToneUp", "ActiveLife"] },
          { titleTemplate: "Pull-Up Assist Bands — Heavy Duty Latex Loop Bands Set of 4", brandPool: ["FlexFit", "PullPro", "BandStrong", "GymCore", "StretchMax"] },
        ],
      },
      {
        name: "Yoga Mats",
        products: [
          { titleTemplate: "Cork Yoga Mat — Natural Non-Slip Surface with TPE Base", brandPool: ["ZenFlow", "CorkYogi", "EarthMat", "NamasteNow", "GreenYoga"] },
          { titleTemplate: "Travel Yoga Mat — Foldable 1.5mm Thin with Carrying Bag", brandPool: ["ZenFlow", "TravelFit", "NomadYoga", "PortaFlex", "LiteFlow"] },
        ],
      },
      {
        name: "Jump Ropes",
        products: [
          { titleTemplate: "Smart Jump Rope with Counter — Digital LCD Display Calorie Tracker", brandPool: ["RopeKing", "SkipSmart", "JumpTech", "CardioRope", "DigiFit"] },
          { titleTemplate: "Heavy Jump Rope — 2.8lb Weighted Battle Rope for CrossFit", brandPool: ["RopeKing", "BattleRope", "CrossPro", "HeavySkip", "PowerRope"] },
        ],
      },
      {
        name: "Foam Rollers",
        products: [
          { titleTemplate: "Vibrating Foam Roller — 4-Speed Electric Massage Roller", brandPool: ["RecoverPro", "VibraRoll", "DeepRelief", "MuscleTech", "TriggerPoint"] },
          { titleTemplate: "Foam Roller Set — 3-Piece Kit with Lacrosse Ball and Stick", brandPool: ["RecoverPro", "RollKit", "MobilityPro", "FlexRelief", "ActiveRecovery"] },
        ],
      },
      {
        name: "Kettlebells",
        products: [
          { titleTemplate: "Adjustable Kettlebell — 5-40 lbs Quick-Lock Weight System", brandPool: ["KettlePro", "FitForge", "IronGrip", "SwingMaster", "PowerHouse"] },
          { titleTemplate: "Cast Iron Kettlebell — Wide Handle Powder Coated Single Piece", brandPool: ["IronGrip", "KettlePro", "GymCore", "SteelFlex", "CastKing"] },
        ],
      },
      {
        name: "Pull-Up Bars",
        products: [
          { titleTemplate: "Doorway Pull-Up Bar — No Screw Installation with Foam Grips", brandPool: ["BarFit", "DoorGym", "PullPro", "UpperBody", "GymCore"] },
          { titleTemplate: "Wall-Mounted Pull-Up Bar — Heavy Duty Steel Multi-Grip Station", brandPool: ["MountFit", "WallGym", "SteelFlex", "PowerHouse", "IronGrip"] },
        ],
      },
      {
        name: "Exercise Balls",
        products: [
          { titleTemplate: "Anti-Burst Exercise Ball — 65cm Yoga Ball with Hand Pump", brandPool: ["BalancePro", "FitBall", "CoreStable", "ZenFlow", "ActiveLife"] },
          { titleTemplate: "Pilates Ball 9\" — Mini Exercise Ball for Core Training", brandPool: ["PilatesPro", "MiniCore", "FlexBall", "ToneUp", "CoreStable"] },
        ],
      },
    ],
  },
  {
    category: "Pet Supplies",
    priceRange: [9.99, 69.99],
    marginRange: [0.30, 0.60],
    subcategories: [
      {
        name: "Grooming",
        products: [
          { titleTemplate: "Pet Nail Grinder — Quiet Electric Trimmer with LED Light", brandPool: ["PawPerfect", "GroomPro", "PetEase", "ClipSafe", "FurCare"] },
          { titleTemplate: "Deshedding Tool for Large Dogs — Stainless Steel Undercoat Rake", brandPool: ["FurBuster", "PawPerfect", "CoatCare", "ShedStop", "GroomPro"] },
          { titleTemplate: "Dog Grooming Kit — Cordless Clipper Set with 4 Guide Combs", brandPool: ["PetEase", "ClipPro", "GroomPro", "FurCare", "PawPerfect"] },
        ],
      },
      {
        name: "Water Fountains",
        products: [
          { titleTemplate: "Cat Water Fountain — Ultra-Quiet Ceramic Pet Drinking Fountain", brandPool: ["AquaPaws", "PurePet", "FlowFresh", "WhiskerWell", "HydroKitty"] },
          { titleTemplate: "Dog Water Dispenser — 1 Gallon Gravity Fed No-Spill Bowl", brandPool: ["AquaPaws", "HydroPaws", "PetWell", "FlowFresh", "DrinkEasy"] },
        ],
      },
      {
        name: "Interactive Toys",
        products: [
          { titleTemplate: "Automatic Cat Laser Toy — Random Pattern Interactive Exercise", brandPool: ["BrainPup", "LaserPaws", "PlayPet", "WhiskerWorld", "FunFeline"] },
          { titleTemplate: "Dog Tug Toy — Suction Cup Chew Rope for Aggressive Chewers", brandPool: ["TugPro", "ChewMaster", "PawPlay", "BrainPup", "ToughToy"] },
          { titleTemplate: "Treat Dispensing Ball — IQ Training Slow Feeder for Dogs", brandPool: ["BrainPup", "SmartPet", "TreatRoll", "PawPlay", "IQPaws"] },
        ],
      },
      {
        name: "Scratching Posts",
        products: [
          { titleTemplate: "Wall-Mounted Cat Shelves — 5-Piece Climbing Set with Scratching Pad", brandPool: ["WhiskerWorld", "CatClimb", "FelineFort", "ScratchCraft", "KittyKing"] },
          { titleTemplate: "Cardboard Cat Scratcher — Reversible Lounge Bed with Catnip", brandPool: ["ScratchCraft", "WhiskerWorld", "CatNap", "FelineFun", "PurrPad"] },
        ],
      },
      {
        name: "Feeding Supplies",
        products: [
          { titleTemplate: "Slow Feeder Dog Bowl — Anti-Bloat Puzzle Design BPA-Free", brandPool: ["NaturPaws", "FeedSmart", "BowlPro", "PetWell", "HealthyEat"] },
          { titleTemplate: "Automatic Pet Feeder — 6L WiFi Programmable with Voice Recorder", brandPool: ["SmartFeed", "PetTech", "AutoBowl", "FeedEasy", "NaturPaws"] },
        ],
      },
      {
        name: "Pet Beds",
        products: [
          { titleTemplate: "Orthopedic Dog Bed — Memory Foam with Removable Washable Cover", brandPool: ["PawRest", "ComfyPet", "SnugPaws", "DreamDog", "OrthoPet"] },
          { titleTemplate: "Calming Cat Bed — Donut Round Faux Fur Self-Warming Cushion", brandPool: ["CozyKitty", "PurrNest", "SnugPaws", "CatNap", "FurComfort"] },
          { titleTemplate: "Elevated Pet Cot — Breathable Mesh Outdoor Raised Dog Bed", brandPool: ["CoolPaws", "AirRest", "PetCot", "BreezeBed", "OutdoorPet"] },
        ],
      },
      {
        name: "Carriers & Travel",
        products: [
          { titleTemplate: "Airline Approved Pet Carrier — Soft-Sided Expandable with Fleece Pad", brandPool: ["TravelPaws", "FlyPet", "JetSet", "PetVoyage", "SkyPaws"] },
          { titleTemplate: "Dog Car Seat Cover — Waterproof Hammock with Mesh Window", brandPool: ["AutoPaws", "DriveSafe", "CarPet", "RideEasy", "PetGuard"] },
        ],
      },
    ],
  },
  {
    category: "Home Office",
    priceRange: [12.99, 89.99],
    marginRange: [0.25, 0.55],
    subcategories: [
      {
        name: "Desk Organizers",
        products: [
          { titleTemplate: "Mesh Desk Organizer — 6-Compartment Office Supply Caddy", brandPool: ["DeskCraft", "OrganiZen", "WorkNeat", "TidyDesk", "OfficePro"] },
          { titleTemplate: "Under Desk Drawer — Slide-Out Adhesive Storage Tray", brandPool: ["HiddenDesk", "DeskCraft", "SlimStore", "WorkNeat", "SpaceSaver"] },
          { titleTemplate: "Desktop File Sorter — 5-Slot Bamboo Paper Organizer", brandPool: ["BambooDesk", "OrganiZen", "EcoOffice", "NaturWork", "TidyDesk"] },
        ],
      },
      {
        name: "Monitor Stands",
        products: [
          { titleTemplate: "Monitor Riser with USB Hub — Tempered Glass Desktop Stand", brandPool: ["ViewRise", "DeskCraft", "ScreenUp", "ElevatePro", "MonitorMate"] },
          { titleTemplate: "Dual Monitor Arm — Gas Spring Full Motion Desk Mount", brandPool: ["ArmTech", "ScreenUp", "DualView", "MountPro", "ErgoArm"] },
          { titleTemplate: "Laptop Stand Adjustable — Ergonomic Aluminum Ventilated Riser", brandPool: ["LaptopLift", "ErgoTech", "CoolStand", "AluRise", "ViewRise"] },
        ],
      },
      {
        name: "Cable Management",
        products: [
          { titleTemplate: "Cable Management Box — Large Cord Organizer with Ventilation", brandPool: ["CableBox", "WireTidy", "CordCraft", "HideWire", "NeatDesk"] },
          { titleTemplate: "Under Desk Cable Tray — Metal Wire Management Rack No Drill", brandPool: ["CableTray", "WireTidy", "DeskCraft", "CordCraft", "MountEasy"] },
          { titleTemplate: "Velcro Cable Ties — 100-Pack Reusable Wire Organizer Straps", brandPool: ["TieRight", "WireTidy", "CordCraft", "StrapPro", "BundleUp"] },
        ],
      },
      {
        name: "Webcams",
        products: [
          { titleTemplate: "4K Webcam with Ring Light — Auto-Focus USB Camera for Streaming", brandPool: ["CamPro", "StreamView", "ClearCam", "VideoLux", "FocusTech"] },
          { titleTemplate: "1080p Webcam with Microphone — Wide Angle Privacy Cover USB", brandPool: ["CamPro", "WebView", "ClearCam", "CallReady", "MeetingCam"] },
        ],
      },
      {
        name: "Ergonomic Accessories",
        products: [
          { titleTemplate: "Ergonomic Wrist Rest — Memory Foam Keyboard Pad with Non-Slip Base", brandPool: ["ErgoRest", "WristWell", "ComfyType", "PadPro", "TypeEase"] },
          { titleTemplate: "Under Desk Footrest — Adjustable Height Ergonomic Foot Hammock", brandPool: ["FootEase", "ErgoRest", "DeskComfort", "RestPro", "LegRelief"] },
          { titleTemplate: "Lumbar Support Pillow — Memory Foam Back Cushion for Office Chair", brandPool: ["BackWell", "ErgoRest", "SpineSupport", "ComfySeat", "PosturePro"] },
        ],
      },
    ],
  },
  {
    category: "Beauty & Personal Care",
    priceRange: [11.99, 79.99],
    marginRange: [0.35, 0.65],
    subcategories: [
      {
        name: "Hair Styling",
        products: [
          { titleTemplate: "Ionic Hair Dryer — 1875W Professional with Diffuser & Concentrator", brandPool: ["GlowPro", "SilkStrand", "BlowDry", "StyleTech", "HairLux"] },
          { titleTemplate: "Hair Straightener Brush — Ceramic Heated Detangling Styler", brandPool: ["SilkStrand", "SmoothGlide", "StyleTech", "HairLux", "GlowPro"] },
          { titleTemplate: "Automatic Curling Iron — Rotating Barrel with LCD Temperature Display", brandPool: ["CurlMaster", "StyleTech", "SilkStrand", "WaveMaker", "HairLux"] },
        ],
      },
      {
        name: "Skincare Tools",
        products: [
          { titleTemplate: "Jade Roller and Gua Sha Set — Natural Stone Face Massage Tools", brandPool: ["GlowUp", "SkinZen", "FaceRitual", "JadeWell", "RadiantSkin"] },
          { titleTemplate: "Facial Cleansing Brush — Silicone Sonic Vibrating Face Scrubber", brandPool: ["SkinZen", "CleanFace", "GlowPro", "PureSkin", "SonicGlow"] },
          { titleTemplate: "LED Face Mask — Red Light Therapy for Skin Rejuvenation", brandPool: ["LightSkin", "GlowUp", "RadiantSkin", "FaceRitual", "DermaTech"] },
          { titleTemplate: "Microcurrent Facial Device — Toning and Lifting Massager", brandPool: ["LiftPro", "SkinTech", "FaceTone", "GlowUp", "DermaTech"] },
        ],
      },
      {
        name: "Nail Care",
        products: [
          { titleTemplate: "Electric Nail File — Professional Manicure Set with 11 Attachments", brandPool: ["NailCraft", "ManicurePro", "PolishPerfect", "GlowUp", "NailTech"] },
          { titleTemplate: "UV LED Nail Lamp — 48W Quick-Dry Gel Polish Curing Light", brandPool: ["GelGlow", "NailCraft", "CurePro", "ManicurePro", "NailTech"] },
        ],
      },
      {
        name: "Oral Care",
        products: [
          { titleTemplate: "Water Flosser Cordless — 300ml Portable Dental Oral Irrigator", brandPool: ["FlossJet", "DentalPro", "AquaClean", "SmileBright", "OralTech"] },
          { titleTemplate: "Electric Toothbrush — Sonic 40,000 VPM with 4 Brush Heads", brandPool: ["SonicSmile", "DentalPro", "BrushTech", "CleanTeeth", "OralTech"] },
        ],
      },
      {
        name: "Makeup Tools",
        products: [
          { titleTemplate: "Makeup Brush Set — 16-Piece Professional with Travel Case", brandPool: ["BrushArt", "GlamKit", "BeautyPro", "MakeupMaven", "StudioBlend"] },
          { titleTemplate: "Lighted Makeup Mirror — 10X Magnification with Suction Cup", brandPool: ["MirrorGlow", "VanityLux", "GlamView", "ReflectPro", "BeautyPro"] },
        ],
      },
    ],
  },
  {
    category: "Electronics Accessories",
    priceRange: [7.99, 49.99],
    marginRange: [0.35, 0.65],
    subcategories: [
      {
        name: "Phone Stands",
        products: [
          { titleTemplate: "Adjustable Phone Stand — Aluminum Desktop Holder Foldable", brandPool: ["TechRise", "PhoneUp", "StandPro", "GripMount", "DeskTech"] },
          { titleTemplate: "Gooseneck Phone Holder — Flexible Arm Bed & Desk Clamp Mount", brandPool: ["FlexiMount", "GooseGrip", "BedTech", "ClampView", "PhoneUp"] },
        ],
      },
      {
        name: "Chargers",
        products: [
          { titleTemplate: "65W GaN USB-C Charger — 3-Port Fast Charging Wall Adapter", brandPool: ["ChargeTech", "PowerPulse", "VoltRush", "FastPlug", "WattPro"] },
          { titleTemplate: "Wireless Charging Pad — 15W Qi Fast Charge with LED Indicator", brandPool: ["QiCharge", "WirelessPro", "ChargeTech", "PowerPulse", "PadCharge"] },
          { titleTemplate: "Power Bank 20000mAh — PD 65W Laptop Portable Charger", brandPool: ["JuicePack", "PowerPulse", "BankPro", "ChargeTech", "MegaWatt"] },
        ],
      },
      {
        name: "Cables",
        products: [
          { titleTemplate: "USB-C Cable 6ft 3-Pack — Braided Nylon Fast Charge Data Sync", brandPool: ["CableCraft", "WireStrong", "LinkPro", "ConnectMax", "DuraWire"] },
          { titleTemplate: "Lightning to USB-C Cable — MFi Certified 2-Pack 10ft", brandPool: ["AppleLink", "CableCraft", "CertWire", "MFiPro", "ConnectMax"] },
        ],
      },
      {
        name: "Screen Protectors",
        products: [
          { titleTemplate: "Tempered Glass Screen Protector — 3-Pack 9H Hardness Anti-Scratch", brandPool: ["ShieldPro", "GlassGuard", "ScreenSafe", "ClearShield", "ArmorGlass"] },
          { titleTemplate: "Privacy Screen Protector — Anti-Spy Tempered Glass Filter", brandPool: ["PrivacyShield", "SpyBlock", "ShieldPro", "SecureScreen", "GlassGuard"] },
        ],
      },
      {
        name: "Audio Accessories",
        products: [
          { titleTemplate: "Wireless Earbuds — Bluetooth 5.3 with Active Noise Cancellation", brandPool: ["SoundPulse", "AudioPro", "BassBoost", "EarTech", "ClearTone"] },
          { titleTemplate: "Bluetooth Speaker — IPX7 Waterproof Portable with 24hr Battery", brandPool: ["SoundPulse", "BassDrop", "AudioPro", "SplashSound", "PartyBoom"] },
          { titleTemplate: "Headphone Stand — Aluminum Alloy Desktop Hanger with Cable Holder", brandPool: ["HeadRest", "AudioMount", "StandPro", "SoundRack", "DeskTech"] },
        ],
      },
      {
        name: "Laptop Accessories",
        products: [
          { titleTemplate: "USB-C Hub 7-in-1 — HDMI 4K, SD Card, USB 3.0 Multiport Adapter", brandPool: ["HubTech", "PortPro", "DockMaster", "MultiLink", "ConnectMax"] },
          { titleTemplate: "Laptop Cooling Pad — 5-Fan RGB with Adjustable Height", brandPool: ["CoolPad", "FanForce", "ChillTech", "LaptopBreeze", "ThermalPro"] },
        ],
      },
    ],
  },
  {
    category: "Outdoor & Garden",
    priceRange: [9.99, 59.99],
    marginRange: [0.30, 0.60],
    subcategories: [
      {
        name: "Solar Lights",
        products: [
          { titleTemplate: "Solar Path Lights — 10-Pack LED Waterproof Garden Walkway Lamps", brandPool: ["SunGlow", "SolarBright", "GardenLux", "PathLight", "EcoSun"] },
          { titleTemplate: "Solar Fence Lights — 4-Pack Outdoor Deck Post Cap Lights", brandPool: ["FenceGlow", "SolarBright", "DeckLight", "SunGlow", "OutdoorLux"] },
          { titleTemplate: "Solar Flood Light — 200 LED Motion Sensor Security Light", brandPool: ["SecureSun", "SolarBright", "FloodPro", "MotionGlow", "SafeLight"] },
        ],
      },
      {
        name: "Planters",
        products: [
          { titleTemplate: "Self-Watering Planter — 10\" Indoor Pot with Water Level Indicator", brandPool: ["PlantWell", "GreenGrow", "PotCraft", "AquaPlant", "BloomBox"] },
          { titleTemplate: "Hanging Planter Set — 3-Pack Macrame Plant Hangers with Pots", brandPool: ["HangGreen", "MacrameCraft", "PlantWell", "BohoGarden", "GreenGrow"] },
          { titleTemplate: "Raised Garden Bed — 4x4 ft Cedar Wood Elevated Planter Box", brandPool: ["GardenCraft", "CedarGrow", "RaisedBed", "PlantWell", "YardPro"] },
        ],
      },
      {
        name: "Hose Accessories",
        products: [
          { titleTemplate: "Expandable Garden Hose — 100ft with 10-Pattern Spray Nozzle", brandPool: ["FlexHose", "GardenFlow", "AquaFlex", "HosePro", "SprayMaster"] },
          { titleTemplate: "Hose Reel Cart — Heavy Duty Mobile with Leader Hose", brandPool: ["ReelPro", "HoseCart", "GardenFlow", "YardMaster", "RollEasy"] },
        ],
      },
      {
        name: "Bird Feeders",
        products: [
          { titleTemplate: "Squirrel-Proof Bird Feeder — Weight-Activated Cage Seed Feeder", brandPool: ["BirdJoy", "FeederPro", "WildWing", "SeedStation", "NatureWatch"] },
          { titleTemplate: "Hummingbird Feeder — Hand-Blown Glass with Ant Moat", brandPool: ["HummerHaven", "BirdJoy", "NectarStation", "WildWing", "GlassGarden"] },
        ],
      },
      {
        name: "Outdoor Furniture",
        products: [
          { titleTemplate: "Patio String Lights — 50ft LED Waterproof Globe Bulbs", brandPool: ["GlowPatio", "StringLux", "OutdoorLux", "PartyLight", "DeckGlow"] },
          { titleTemplate: "Outdoor Seat Cushion Set — 4-Pack Water Resistant Patio Pads", brandPool: ["CushionCraft", "PatioComfort", "SeatPro", "OutdoorRest", "DeckStyle"] },
        ],
      },
      {
        name: "Garden Tools",
        products: [
          { titleTemplate: "Garden Tool Set — 10-Piece Stainless Steel with Tote Bag", brandPool: ["GardenCraft", "DigPro", "GreenThumb", "YardMaster", "PlantWell"] },
          { titleTemplate: "Pruning Shears Professional — Bypass Hand Pruner with Safety Lock", brandPool: ["SnipPro", "GardenCraft", "SharpCut", "PruneMaster", "GreenThumb"] },
        ],
      },
    ],
  },
  {
    category: "Baby & Kids",
    priceRange: [10.99, 79.99],
    marginRange: [0.30, 0.55],
    subcategories: [
      {
        name: "Baby Monitors",
        products: [
          { titleTemplate: "Video Baby Monitor — 5\" HD Display with Night Vision & Lullabies", brandPool: ["BabyWatch", "SafeSleep", "TinyView", "ParentEye", "NurseryCam"] },
          { titleTemplate: "WiFi Baby Camera — 1080p Pan Tilt with Two-Way Audio", brandPool: ["SmartBaby", "BabyWatch", "NurseryCam", "SafeSleep", "CribView"] },
        ],
      },
      {
        name: "Safety Gates",
        products: [
          { titleTemplate: "Baby Gate Pressure Mount — 30\" Tall Auto-Close Walk-Through", brandPool: ["SafeStep", "GatePro", "KidSafe", "TinyGuard", "SecureBaby"] },
          { titleTemplate: "Retractable Baby Gate — 55\" Wide Mesh Indoor Stair Gate", brandPool: ["RetractSafe", "GatePro", "FlexGate", "KidSafe", "SafeStep"] },
        ],
      },
      {
        name: "Feeding",
        products: [
          { titleTemplate: "Silicone Baby Bibs — 3-Pack Waterproof with Food Catcher Pocket", brandPool: ["TinyBites", "BabyFeed", "MealTime", "SiliBaby", "MessFree"] },
          { titleTemplate: "Baby Food Maker — 5-in-1 Steamer Blender with Self-Clean", brandPool: ["BabyBlend", "NutriTiny", "MealTime", "PrepBaby", "FoodStage"] },
          { titleTemplate: "Toddler Utensil Set — Stainless Steel with Silicone Handles 6-Pack", brandPool: ["TinyBites", "KidEat", "MealTime", "GrabEasy", "FirstFork"] },
        ],
      },
      {
        name: "Bath",
        products: [
          { titleTemplate: "Baby Bath Thermometer — Floating Duck Digital Temperature Display", brandPool: ["BathBuddy", "TubTemp", "SplashSafe", "DuckieTech", "BabyBath"] },
          { titleTemplate: "Bath Toy Organizer — Mesh Net Corner Storage with Suction Cups", brandPool: ["TubTidy", "BathBuddy", "ToyStore", "SplashOrg", "CleanBath"] },
          { titleTemplate: "Baby Shampoo Rinse Cup — Waterfall Rinser with Soft Rubber Edge", brandPool: ["RinsePro", "BathBuddy", "SplashSafe", "GentleWash", "BabyBath"] },
        ],
      },
      {
        name: "Toys & Learning",
        products: [
          { titleTemplate: "Montessori Busy Board — Wooden Sensory Activity Panel for Toddlers", brandPool: ["TinyLearn", "MontessoriKid", "PlayWise", "WoodWonder", "LearnPlay"] },
          { titleTemplate: "Magnetic Tiles Building Set — 60-Piece STEM Construction Toy", brandPool: ["MagBuild", "TileGenius", "STEMKid", "BuildBright", "TinyLearn"] },
          { titleTemplate: "Water Drawing Mat — Large Aqua Doodle Pad 40x30 inch", brandPool: ["AquaDoodle", "DrawFun", "TinyArt", "SplashDraw", "KidCanvas"] },
        ],
      },
    ],
  },
  {
    category: "Automotive",
    priceRange: [9.99, 69.99],
    marginRange: [0.30, 0.55],
    subcategories: [
      {
        name: "Phone Mounts",
        products: [
          { titleTemplate: "Magnetic Car Phone Mount — Dashboard Vent Clip Universal Holder", brandPool: ["AutoGrip", "MountDrive", "CarTech", "VentGrip", "DriveEasy"] },
          { titleTemplate: "Cup Holder Phone Mount — Adjustable Gooseneck Car Cradle", brandPool: ["CupGrip", "AutoGrip", "CarTech", "FlexDrive", "MountDrive"] },
        ],
      },
      {
        name: "Car Organizers",
        products: [
          { titleTemplate: "Car Trunk Organizer — Collapsible Multi-Compartment Storage Box", brandPool: ["TrunkTidy", "AutoOrg", "CarNeat", "DriveClean", "StoreDrive"] },
          { titleTemplate: "Car Seat Gap Filler — 2-Pack Console Side Pocket Organizer", brandPool: ["GapStop", "AutoOrg", "SeatTidy", "CarNeat", "FillPro"] },
          { titleTemplate: "Backseat Car Organizer — Kick Mat with Tablet Holder & Pockets", brandPool: ["BackTidy", "AutoOrg", "KidRide", "SeatShield", "DriveClean"] },
        ],
      },
      {
        name: "Cleaning",
        products: [
          { titleTemplate: "Car Vacuum Cleaner — 12V Portable Handheld with HEPA Filter", brandPool: ["AutoVac", "CleanDrive", "VacPro", "CarClean", "DustBuster"] },
          { titleTemplate: "Microfiber Car Wash Kit — 25-Piece Detailing Set with Bucket", brandPool: ["DetailPro", "CarShine", "WashCraft", "AutoClean", "BuffMaster"] },
          { titleTemplate: "Windshield Cleaning Tool — Extendable Handle Microfiber Auto Glass", brandPool: ["GlassClear", "WindoClean", "AutoShine", "ClearView", "CarClean"] },
        ],
      },
      {
        name: "Dash Cams",
        products: [
          { titleTemplate: "Dash Cam Front & Rear — 4K + 1080p Dual Camera with Night Vision", brandPool: ["DashEye", "RoadCam", "DriveSafe", "CamDrive", "RecordPro"] },
          { titleTemplate: "Mini Dash Cam — 1080p WiFi Connected with Loop Recording", brandPool: ["MiniCam", "DashEye", "CompactDrive", "RoadWatch", "CamDrive"] },
        ],
      },
      {
        name: "Interior Accessories",
        products: [
          { titleTemplate: "Car Seat Covers — Full Set Faux Leather Waterproof with Lumbar", brandPool: ["SeatLux", "AutoCover", "DriveFit", "CoverCraft", "ComfyRide"] },
          { titleTemplate: "Steering Wheel Cover — Breathable Microfiber Leather Anti-Slip", brandPool: ["WheelWrap", "GripDrive", "AutoCover", "SteerComfort", "DriveFit"] },
          { titleTemplate: "Car Air Freshener — Vent Clip Aromatherapy Essential Oil Diffuser", brandPool: ["FreshDrive", "AromaCar", "ScentRide", "AirPure", "DriveZen"] },
        ],
      },
    ],
  },
  {
    category: "Health & Wellness",
    priceRange: [14.99, 129.99],
    marginRange: [0.30, 0.60],
    subcategories: [
      {
        name: "Massage Devices",
        products: [
          { titleTemplate: "Percussion Massage Gun — 30-Speed Deep Tissue with 6 Heads", brandPool: ["MuscleRelief", "PulsePro", "DeepHit", "RecoverMax", "TherapyGun"] },
          { titleTemplate: "Shiatsu Neck Massager — Heated Pillow with 3D Rotating Nodes", brandPool: ["NeckEase", "ShiatsuPro", "HeatRelief", "MassageLux", "ComfortZone"] },
          { titleTemplate: "Eye Massager — Heated Air Compression with Bluetooth Music", brandPool: ["EyeRest", "VisionCare", "RelaxEye", "TempleEase", "SootheSight"] },
        ],
      },
      {
        name: "Posture Correctors",
        products: [
          { titleTemplate: "Posture Corrector for Men & Women — Adjustable Back Brace", brandPool: ["PosturePro", "BackRight", "SpineAlign", "StandTall", "ErgoBack"] },
          { titleTemplate: "Smart Posture Trainer — Vibrating Reminder Device with App", brandPool: ["PostureTech", "SpineAlign", "SmartBack", "AlignPro", "PosturePro"] },
        ],
      },
      {
        name: "Blue Light Glasses",
        products: [
          { titleTemplate: "Blue Light Blocking Glasses — Anti-Strain Computer Reading Eyewear", brandPool: ["ScreenShield", "BluBlock", "EyeEase", "DigitalGuard", "ClearView"] },
          { titleTemplate: "Gaming Glasses — Blue Light Filter with Anti-Glare Coating", brandPool: ["GameEye", "ScreenShield", "BluBlock", "PixelGuard", "GlareStop"] },
        ],
      },
      {
        name: "Sleep Aids",
        products: [
          { titleTemplate: "White Noise Machine — 30 Soothing Sounds with Night Light", brandPool: ["SleepWell", "SoundSleep", "DreamMachine", "RestEasy", "NightCalm"] },
          { titleTemplate: "Weighted Blanket — 20 lbs Glass Bead Cotton with Cooling Cover", brandPool: ["HeavyRest", "SleepWell", "GravityComfort", "CalmBlanket", "DeepSleep"] },
          { titleTemplate: "Sleep Mask — 3D Contoured Memory Foam with Adjustable Strap", brandPool: ["DreamMask", "SleepWell", "NightShield", "RestEasy", "EyeComfort"] },
        ],
      },
      {
        name: "Fitness Trackers",
        products: [
          { titleTemplate: "Fitness Watch — Heart Rate SpO2 Sleep Tracking IP68 Waterproof", brandPool: ["TrackFit", "PulseBand", "HealthWatch", "FitSmart", "ActiveBand"] },
          { titleTemplate: "Smart Ring — Health Tracker with Sleep & Activity Monitoring", brandPool: ["RingFit", "SmartBand", "HealthRing", "TrackFit", "WellRing"] },
        ],
      },
      {
        name: "Supplements & Storage",
        products: [
          { titleTemplate: "Pill Organizer Weekly — AM PM Moisture-Proof Medication Dispenser", brandPool: ["PillPro", "MedBox", "HealthOrg", "DoseRight", "MediTidy"] },
          { titleTemplate: "Vitamin Storage Box — 28-Day Stackable Pill Case with Labels", brandPool: ["VitaBox", "PillPro", "HealthOrg", "StackMed", "DoseRight"] },
        ],
      },
    ],
  },
  {
    category: "Tools & Home Improvement",
    priceRange: [12.99, 89.99],
    marginRange: [0.25, 0.55],
    subcategories: [
      {
        name: "Hand Tools",
        products: [
          { titleTemplate: "Magnetic Screwdriver Set — 12-Piece Precision Phillips & Flathead Kit", brandPool: ["IronGrip", "ToolSmith", "ProForge", "HandyMaster", "SteelCraft"] },
          { titleTemplate: "Adjustable Wrench Set — 3-Piece Chrome Vanadium with Soft Grip Handles", brandPool: ["WrenchPro", "IronGrip", "ToolSmith", "TorqueKing", "ProForge"] },
          { titleTemplate: "Needle Nose Pliers — 6-Inch Spring-Loaded with Wire Cutter", brandPool: ["GripTech", "ToolSmith", "IronGrip", "ProForge", "PrecisionPro"] },
        ],
      },
      {
        name: "Power Tool Accessories",
        products: [
          { titleTemplate: "Drill Bit Set — 29-Piece Titanium HSS for Metal Wood Plastic", brandPool: ["DrillMax", "BitForce", "ToolSmith", "ProForge", "SteelCraft"] },
          { titleTemplate: "Oscillating Multi-Tool Blade Set — 20-Piece Universal Quick-Release", brandPool: ["BladeForce", "CutPro", "ToolSmith", "DrillMax", "ProForge"] },
        ],
      },
      {
        name: "Measuring & Layout",
        products: [
          { titleTemplate: "Digital Tape Measure — 130ft Laser Distance Meter with LCD Display", brandPool: ["MeasurePro", "LaserLine", "ToolSmith", "PrecisionPro", "LevelKing"] },
          { titleTemplate: "Torpedo Level — 9-Inch Magnetic Aluminum with 3 Bubble Vials", brandPool: ["LevelKing", "MeasurePro", "ProForge", "PrecisionPro", "ToolSmith"] },
          { titleTemplate: "Combination Square Set — 12-Inch Stainless Steel with Protractor Head", brandPool: ["PrecisionPro", "MeasurePro", "ToolSmith", "LevelKing", "ProForge"] },
        ],
      },
      {
        name: "Fasteners & Hardware",
        products: [
          { titleTemplate: "Wall Anchor Kit — 200-Piece Drywall Anchors & Screws Assortment", brandPool: ["FastenRight", "AnchorPro", "SteelCraft", "HangTight", "WallMaster"] },
          { titleTemplate: "Stainless Steel Screw Assortment — 500-Piece Phillips Head Wood Screws", brandPool: ["SteelCraft", "FastenRight", "ProForge", "HangTight", "BoltKing"] },
        ],
      },
      {
        name: "Plumbing",
        products: [
          { titleTemplate: "Pipe Wrench Set — 2-Piece Heavy Duty Adjustable Aluminum", brandPool: ["PipePro", "FlowMaster", "WrenchPro", "IronGrip", "ToolSmith"] },
          { titleTemplate: "Faucet & Sink Installer Tool — Multi-Purpose Under-Sink Wrench", brandPool: ["PlumbEasy", "FlowMaster", "PipePro", "ToolSmith", "ProForge"] },
          { titleTemplate: "Plumber's Tape — 10-Pack PTFE Thread Seal Tape for Pipe Fittings", brandPool: ["SealPro", "FlowMaster", "PipePro", "PlumbEasy", "TightSeal"] },
        ],
      },
      {
        name: "Painting Supplies",
        products: [
          { titleTemplate: "Paint Roller Kit — 9-Piece Microfiber Roller Set with Tray & Covers", brandPool: ["RollPro", "PaintMaster", "CoatCraft", "BrushKing", "ColorFlow"] },
          { titleTemplate: "Painter's Tape — Multi-Surface 6-Pack Clean Release Masking Tape", brandPool: ["TapePro", "PaintMaster", "CleanEdge", "CoatCraft", "MaskRight"] },
        ],
      },
      {
        name: "Electrical",
        products: [
          { titleTemplate: "Wire Stripper — Self-Adjusting 8-Inch with Cable Cutter & Crimper", brandPool: ["WirePro", "VoltCraft", "ElectraTool", "CircuitMaster", "ToolSmith"] },
          { titleTemplate: "Electrical Tape — 10-Pack Vinyl PVC Insulating Tape Assorted Colors", brandPool: ["VoltCraft", "WirePro", "ElectraTool", "SealPro", "CircuitMaster"] },
          { titleTemplate: "Voltage Tester Pen — Non-Contact AC 12-1000V with LED Flashlight", brandPool: ["CircuitMaster", "VoltCraft", "ElectraTool", "WirePro", "TestPro"] },
        ],
      },
    ],
  },
  {
    category: "Garden & Outdoor Living",
    priceRange: [14.99, 79.99],
    marginRange: [0.30, 0.60],
    subcategories: [
      {
        name: "Planters & Pots",
        products: [
          { titleTemplate: "Self-Watering Planter Set — 5-Pack Indoor Herb Pots with Drainage Tray", brandPool: ["GreenThumb", "PlantCraft", "GardenJoy", "BloomBox", "TerraGrow"] },
          { titleTemplate: "Hanging Planter Baskets — 4-Pack Macrame Plant Hangers with Hooks", brandPool: ["PlantCraft", "GreenThumb", "HangGarden", "BloomBox", "BotanicalHome"] },
          { titleTemplate: "Ceramic Succulent Pots — 6-Pack Mini Planters with Bamboo Saucers", brandPool: ["BloomBox", "TerraGrow", "GreenThumb", "PlantCraft", "SucculentLife"] },
        ],
      },
      {
        name: "Garden Hand Tools",
        products: [
          { titleTemplate: "Garden Tool Set — 5-Piece Aluminum Alloy with Ergonomic Handles", brandPool: ["DigRight", "GardenJoy", "GreenThumb", "PlantCraft", "TerraGrow"] },
          { titleTemplate: "Pruning Shears — Bypass Secateurs with SK-5 Steel Blade & Safety Lock", brandPool: ["TrimPro", "GardenJoy", "DigRight", "GreenThumb", "BladeGarden"] },
        ],
      },
      {
        name: "Watering Equipment",
        products: [
          { titleTemplate: "Expandable Garden Hose — 100ft Lightweight with 10-Pattern Spray Nozzle", brandPool: ["FlowGarden", "AquaGrow", "GreenThumb", "WaterWise", "GardenJoy"] },
          { titleTemplate: "Drip Irrigation Kit — 132ft Automatic Micro Sprinkler System", brandPool: ["AquaGrow", "FlowGarden", "WaterWise", "GardenJoy", "IrrigaPro"] },
          { titleTemplate: "Watering Can — 1-Gallon Stainless Steel with Long Spout for Indoor Plants", brandPool: ["PlantCraft", "GreenThumb", "WaterWise", "BloomBox", "GardenJoy"] },
        ],
      },
      {
        name: "Seeds & Bulbs",
        products: [
          { titleTemplate: "Heirloom Vegetable Seed Variety Pack — 20 Packets Non-GMO Organic", brandPool: ["SeedVault", "GrowOrganic", "HarvestKing", "GardenJoy", "NatureSeed"] },
          { titleTemplate: "Wildflower Seed Mix — 1lb Pollinator-Friendly Annual & Perennial Blend", brandPool: ["WildBloom", "SeedVault", "GardenJoy", "NatureSeed", "GrowOrganic"] },
        ],
      },
      {
        name: "Composting",
        products: [
          { titleTemplate: "Countertop Compost Bin — 1.3 Gallon Stainless Steel with Charcoal Filter", brandPool: ["CompostKing", "GreenCycle", "EcoGrow", "GardenJoy", "TerraGrow"] },
          { titleTemplate: "Tumbling Composter — 43-Gallon Dual Chamber Outdoor Compost Bin", brandPool: ["GreenCycle", "CompostKing", "EcoGrow", "GardenJoy", "RotGrow"] },
        ],
      },
      {
        name: "Outdoor Lighting",
        products: [
          { titleTemplate: "Solar Path Lights — 12-Pack LED Stainless Steel Garden Stakes", brandPool: ["SunGlow", "SolarBright", "GardenJoy", "PathLight", "GreenThumb"] },
          { titleTemplate: "Solar Fairy Lights — 200 LED Outdoor String Lights Warm White 72ft", brandPool: ["SolarBright", "SunGlow", "GlowGarden", "PathLight", "GardenJoy"] },
          { titleTemplate: "Motion Sensor Flood Light — Solar Powered 100 LED Security Light", brandPool: ["SunGlow", "SolarBright", "BrightGuard", "GardenJoy", "PathLight"] },
        ],
      },
      {
        name: "Pest Control",
        products: [
          { titleTemplate: "Ultrasonic Pest Repeller — 6-Pack Indoor Plug-In for Mice & Insects", brandPool: ["PestAway", "BugShield", "SonicGuard", "HomeSafe", "CritterStop"] },
          { titleTemplate: "Yellow Sticky Traps — 50-Pack Dual-Sided Gnat & Fly Traps for Plants", brandPool: ["BugShield", "PestAway", "TrapKing", "GardenJoy", "FlyFree"] },
        ],
      },
    ],
  },
  {
    category: "Arts, Crafts & Sewing",
    priceRange: [8.99, 49.99],
    marginRange: [0.35, 0.65],
    subcategories: [
      {
        name: "Drawing & Sketching",
        products: [
          { titleTemplate: "Professional Sketch Pencil Set — 33-Piece Drawing Kit with Charcoal & Pastels", brandPool: ["ArtVision", "SketchPro", "DrawCraft", "CreativeEdge", "PencilMaster"] },
          { titleTemplate: "Drawing Pad — 100-Sheet 9x12 Inch Heavyweight Smooth Bristol Paper", brandPool: ["PaperArts", "SketchPro", "ArtVision", "DrawCraft", "CanvasKing"] },
          { titleTemplate: "Blending Stumps — 12-Pack Tortillon Set with Sandpaper Sharpener", brandPool: ["DrawCraft", "ArtVision", "SketchPro", "BlendMaster", "CreativeEdge"] },
        ],
      },
      {
        name: "Painting Supplies",
        products: [
          { titleTemplate: "Acrylic Paint Set — 24 Colors Non-Toxic Rich Pigment Tubes", brandPool: ["ColorSplash", "PaintCraft", "ArtVision", "BrushStroke", "PigmentPro"] },
          { titleTemplate: "Watercolor Brush Pen Set — 48 Colors with Water Brush for Calligraphy", brandPool: ["AquaBrush", "ColorSplash", "PaintCraft", "ArtVision", "WashTone"] },
        ],
      },
      {
        name: "Sewing Notions",
        products: [
          { titleTemplate: "Sewing Kit — 136-Piece Professional Repair Set with Scissors & Needles", brandPool: ["StitchPro", "SewCraft", "ThreadMaster", "NeedleArts", "FabricFix"] },
          { titleTemplate: "Rotary Cutter Set — 45mm with 5 Replacement Blades & Cutting Mat", brandPool: ["CutCraft", "StitchPro", "SewCraft", "FabricFix", "BladeArts"] },
          { titleTemplate: "Sewing Thread Set — 60 Spools Polyester All-Purpose Assorted Colors", brandPool: ["ThreadMaster", "StitchPro", "SewCraft", "ColorThread", "NeedleArts"] },
        ],
      },
      {
        name: "Knitting & Crochet",
        products: [
          { titleTemplate: "Crochet Hook Set — 14-Piece Ergonomic Soft Grip with Case", brandPool: ["YarnCraft", "HookPro", "StitchJoy", "FiberArts", "KnitMaster"] },
          { titleTemplate: "Knitting Needle Set — Bamboo Circular Needles 18 Sizes with Case", brandPool: ["KnitMaster", "YarnCraft", "BambooArts", "StitchJoy", "FiberArts"] },
        ],
      },
      {
        name: "Jewelry Making",
        products: [
          { titleTemplate: "Jewelry Making Kit — 1500-Piece Beading Supplies with Pliers & Wire", brandPool: ["BeadCraft", "JewelPro", "GemArts", "SparkleKit", "CharmMaster"] },
          { titleTemplate: "Resin Art Kit — Crystal Clear Epoxy with Molds & Pigments for Pendants", brandPool: ["ResinCraft", "JewelPro", "ClearCast", "GemArts", "ArtResin"] },
          { titleTemplate: "Earring Making Kit — 2400-Piece Hooks Backs Posts & Jump Rings Set", brandPool: ["CharmMaster", "BeadCraft", "JewelPro", "GemArts", "SparkleKit"] },
        ],
      },
      {
        name: "Scrapbooking",
        products: [
          { titleTemplate: "Scrapbook Album — 12x12 Inch Leather Cover with 60 Acid-Free Pages", brandPool: ["MemoryBook", "ScrapCraft", "PageArts", "AlbumPro", "KeepsakeKing"] },
          { titleTemplate: "Washi Tape Set — 40 Rolls Decorative Masking Tape with Dispenser", brandPool: ["TapeArts", "ScrapCraft", "MemoryBook", "WashiWorld", "DecoTape"] },
        ],
      },
      {
        name: "Calligraphy",
        products: [
          { titleTemplate: "Calligraphy Pen Set — 17-Piece Dip Pen Kit with 12 Ink Colors", brandPool: ["InkCraft", "PenMaster", "ScriptPro", "CalliArts", "QuillKing"] },
          { titleTemplate: "Hand Lettering Practice Pad — 200-Sheet Tracing Paper with Guide Lines", brandPool: ["ScriptPro", "InkCraft", "LetterArts", "CalliArts", "PenMaster"] },
          { titleTemplate: "Brush Pen Set — 24 Flexible Tip Markers for Lettering & Drawing", brandPool: ["CalliArts", "InkCraft", "PenMaster", "ScriptPro", "BrushWrite"] },
        ],
      },
    ],
  },
  {
    category: "Travel Accessories",
    priceRange: [12.99, 69.99],
    marginRange: [0.30, 0.60],
    subcategories: [
      {
        name: "Packing Organizers",
        products: [
          { titleTemplate: "Packing Cubes Set — 6-Piece Compression Travel Organizers with Laundry Bag", brandPool: ["PackSmart", "TravelPro", "JetSet", "VoyageGear", "NomadPack"] },
          { titleTemplate: "Vacuum Storage Bags — 12-Pack Travel Size Hand-Roll Compression Bags", brandPool: ["SpaceSaver", "PackSmart", "TravelPro", "CompressPro", "JetSet"] },
          { titleTemplate: "Shoe Bags for Travel — 8-Pack Waterproof Drawstring Shoe Organizers", brandPool: ["TravelPro", "PackSmart", "JetSet", "NomadPack", "ShoeGuard"] },
        ],
      },
      {
        name: "Luggage Tags & Locks",
        products: [
          { titleTemplate: "TSA Approved Luggage Locks — 4-Pack Combination Padlock for Suitcases", brandPool: ["LockSafe", "TravelPro", "TSAGuard", "SecureTrip", "JetSet"] },
          { titleTemplate: "Leather Luggage Tags — 4-Pack Privacy Flap ID Labels for Bags", brandPool: ["TagCraft", "TravelPro", "JetSet", "NomadPack", "LuxeTravel"] },
        ],
      },
      {
        name: "Travel Pillows",
        products: [
          { titleTemplate: "Memory Foam Travel Pillow — Ergonomic Neck Support with Snap Loop", brandPool: ["DreamTravel", "NeckEase", "TravelPro", "RestFly", "JetSet"] },
          { titleTemplate: "Inflatable Travel Pillow — Ultralight Compact Neck Rest with Velvet Cover", brandPool: ["AirRest", "DreamTravel", "TravelPro", "LightPack", "NeckEase"] },
        ],
      },
      {
        name: "Adapters & Chargers",
        products: [
          { titleTemplate: "Universal Travel Adapter — All-in-One International Power Plug with USB-C", brandPool: ["VoltTrip", "PowerGo", "TravelPro", "ChargeWorld", "GlobalPlug"] },
          { titleTemplate: "Portable Charger — 10000mAh Slim Power Bank with Dual USB Output", brandPool: ["ChargeWorld", "PowerGo", "VoltTrip", "JetPower", "TravelPro"] },
          { titleTemplate: "Travel Power Strip — 3 AC Outlets & 4 USB Ports with 5ft Cord", brandPool: ["PowerGo", "VoltTrip", "ChargeWorld", "TravelPro", "PlugStation"] },
        ],
      },
      {
        name: "Toiletry Bags",
        products: [
          { titleTemplate: "Hanging Toiletry Bag — Water-Resistant Organizer with TSA Bottles", brandPool: ["FreshPack", "TravelPro", "JetSet", "CleanGo", "NomadPack"] },
          { titleTemplate: "Leak-Proof Toiletry Bag — Clear TSA-Approved Quart Size Travel Pouch", brandPool: ["CleanGo", "FreshPack", "TravelPro", "TSAGuard", "ClearPack"] },
        ],
      },
      {
        name: "Document Holders",
        products: [
          { titleTemplate: "Family Passport Holder — RFID Blocking Travel Document Wallet for 6", brandPool: ["SecureTravel", "DocSafe", "TravelPro", "RFIDGuard", "JetSet"] },
          { titleTemplate: "Neck Wallet — Hidden RFID Blocking Travel Pouch for Passport & Cards", brandPool: ["StealthPack", "SecureTravel", "DocSafe", "TravelPro", "RFIDGuard"] },
        ],
      },
      {
        name: "Compression Bags",
        products: [
          { titleTemplate: "Travel Compression Bags — 10-Pack No Vacuum Needed Roll-Up Space Saver", brandPool: ["SpaceSaver", "CompressPro", "PackSmart", "TravelPro", "FlatPack"] },
          { titleTemplate: "Waterproof Dry Bags — 5-Pack Assorted Sizes for Beach & Kayak Travel", brandPool: ["DryTrip", "AquaPack", "TravelPro", "WaterGuard", "NomadPack"] },
          { titleTemplate: "Garment Bags for Travel — 5-Pack Suit Bags with Clear Window & Zipper", brandPool: ["SuitGuard", "TravelPro", "PackSmart", "GarmentPro", "JetSet"] },
        ],
      },
    ],
  },
  {
    category: "Smart Home Accessories",
    priceRange: [15.99, 99.99],
    marginRange: [0.25, 0.50],
    subcategories: [
      {
        name: "Smart Plugs",
        products: [
          { titleTemplate: "WiFi Smart Plug — 4-Pack Mini Outlet with Timer & Energy Monitoring", brandPool: ["SmartFlow", "PlugIQ", "HomeLink", "ConnectPro", "WiseHome"] },
          { titleTemplate: "Outdoor Smart Plug — Waterproof WiFi Outlet with 2 Sockets & Timer", brandPool: ["PlugIQ", "SmartFlow", "OutdoorIQ", "HomeLink", "WiseHome"] },
        ],
      },
      {
        name: "Sensor Kits",
        products: [
          { titleTemplate: "Door & Window Sensor Kit — 6-Pack WiFi Alarm with App Notifications", brandPool: ["SenseHome", "AlertIQ", "SmartFlow", "HomeLink", "GuardTech"] },
          { titleTemplate: "Water Leak Detector — 4-Pack WiFi Flood Sensor with 100dB Alarm", brandPool: ["LeakGuard", "SenseHome", "AlertIQ", "HomeLink", "SmartFlow"] },
          { titleTemplate: "Temperature & Humidity Monitor — WiFi Sensor with LCD Display & Alerts", brandPool: ["ClimateIQ", "SenseHome", "AlertIQ", "SmartFlow", "HomeLink"] },
        ],
      },
      {
        name: "Cable Management",
        products: [
          { titleTemplate: "Cable Management Box — Large Cord Organizer with Ventilation Slots", brandPool: ["CableFlow", "TidyDesk", "WireHide", "OrganiPro", "SmartFlow"] },
          { titleTemplate: "Cable Clips — 50-Pack Self-Adhesive Wire Holders for Desk & Wall", brandPool: ["WireHide", "CableFlow", "TidyDesk", "ClipPro", "OrganiPro"] },
        ],
      },
      {
        name: "Smart Lighting",
        products: [
          { titleTemplate: "Smart LED Bulb Set — 4-Pack Color Changing WiFi A19 with App Control", brandPool: ["LumiSmart", "GlowIQ", "HomeLink", "SmartFlow", "BrightHome"] },
          { titleTemplate: "LED Light Strip — 32ft RGB WiFi Color Changing with Music Sync", brandPool: ["GlowIQ", "LumiSmart", "StripBright", "HomeLink", "SmartFlow"] },
          { titleTemplate: "Smart Night Light — Motion Sensor Plug-In with Adjustable Brightness", brandPool: ["LumiSmart", "GlowIQ", "NightIQ", "HomeLink", "BrightHome"] },
        ],
      },
      {
        name: "Remote Controls",
        products: [
          { titleTemplate: "Universal Smart Remote — IR Blaster WiFi Hub for TV AC & Appliances", brandPool: ["RemoteIQ", "ControlHub", "SmartFlow", "HomeLink", "CommandPro"] },
          { titleTemplate: "Smart Button — WiFi One-Touch Trigger for Scenes & Automations", brandPool: ["TapIQ", "RemoteIQ", "SmartFlow", "HomeLink", "ControlHub"] },
        ],
      },
      {
        name: "Smart Doorbells",
        products: [
          { titleTemplate: "Video Doorbell Camera — 2K WiFi with Night Vision & Two-Way Audio", brandPool: ["DoorGuard", "ViewIQ", "HomeLink", "SmartFlow", "SecureHome"] },
          { titleTemplate: "Wireless Doorbell Kit — 1000ft Range with 58 Chimes & LED Flash", brandPool: ["ChimeIQ", "DoorGuard", "HomeLink", "SmartFlow", "BellPro"] },
        ],
      },
      {
        name: "WiFi Extenders",
        products: [
          { titleTemplate: "WiFi Mesh Extender — Dual Band 1200Mbps Whole Home Coverage Booster", brandPool: ["NetBoost", "SignalMax", "MeshIQ", "HomeLink", "WifiPro"] },
          { titleTemplate: "Powerline WiFi Kit — 2-Pack Ethernet Over Power with WiFi Clone", brandPool: ["SignalMax", "NetBoost", "PowerNet", "HomeLink", "MeshIQ"] },
          { titleTemplate: "WiFi Antenna — High Gain USB Adapter with 5dBi Dual Band Antenna", brandPool: ["MeshIQ", "NetBoost", "SignalMax", "WifiPro", "HomeLink"] },
        ],
      },
    ],
  },
  {
    category: "Cleaning & Organization",
    priceRange: [9.99, 59.99],
    marginRange: [0.35, 0.65],
    subcategories: [
      {
        name: "Drawer Organizers",
        products: [
          { titleTemplate: "Bamboo Drawer Organizer Set — 6-Piece Expandable Kitchen Utensil Tray", brandPool: ["TidyHome", "OrganiZen", "NeatNest", "ClutterFree", "SpaceSmart"] },
          { titleTemplate: "Junk Drawer Organizer — 8-Compartment Clear Acrylic Tray with Dividers", brandPool: ["NeatNest", "TidyHome", "OrganiZen", "ClearSort", "SpaceSmart"] },
        ],
      },
      {
        name: "Closet Systems",
        products: [
          { titleTemplate: "Closet Organizer Shelves — 6-Shelf Hanging Fabric Storage with Side Pockets", brandPool: ["ClosetPro", "HangRight", "TidyHome", "SpaceSmart", "OrganiZen"] },
          { titleTemplate: "Velvet Hangers — 50-Pack Non-Slip Slim Space-Saving Coat Hangers", brandPool: ["HangRight", "ClosetPro", "SlimHang", "TidyHome", "NeatNest"] },
          { titleTemplate: "Over-Door Organizer — 24-Pocket Clear Shoe Rack with Metal Hooks", brandPool: ["DoorStore", "ClosetPro", "HangRight", "TidyHome", "SpaceSmart"] },
        ],
      },
      {
        name: "Cleaning Tools",
        products: [
          { titleTemplate: "Microfiber Mop — Spray Mop with 4 Reusable Pads & 360° Swivel Head", brandPool: ["CleanSweep", "MopMaster", "SparkleHome", "TidyHome", "ShineRight"] },
          { titleTemplate: "Electric Spin Scrubber — Cordless Power Brush with 8 Replaceable Heads", brandPool: ["ScrubPro", "CleanSweep", "SparkleHome", "PowerClean", "ShineRight"] },
        ],
      },
      {
        name: "Laundry Accessories",
        products: [
          { titleTemplate: "Mesh Laundry Bags — 7-Pack Delicates Wash Bags Assorted Sizes", brandPool: ["WashGuard", "LaundryPro", "TidyHome", "FabricCare", "CleanSweep"] },
          { titleTemplate: "Foldable Laundry Basket — 3-Pack Pop-Up Hamper with Handles", brandPool: ["LaundryPro", "WashGuard", "TidyHome", "FoldFlat", "NeatNest"] },
          { titleTemplate: "Wrinkle Release Spray — 16oz Fabric Refresher with Fresh Linen Scent", brandPool: ["FreshPress", "FabricCare", "WashGuard", "LaundryPro", "SmoothWear"] },
        ],
      },
      {
        name: "Shelf Liners",
        products: [
          { titleTemplate: "Non-Adhesive Shelf Liner — 17.5in x 20ft Waterproof Cabinet Mat Roll", brandPool: ["LinerPro", "ShelfGuard", "TidyHome", "CabinetCraft", "NeatNest"] },
          { titleTemplate: "Refrigerator Liner Set — 9-Pack Washable Fridge Mats Anti-Slip", brandPool: ["FreshLiner", "ShelfGuard", "LinerPro", "TidyHome", "CoolMat"] },
        ],
      },
      {
        name: "Label Makers",
        products: [
          { titleTemplate: "Label Maker Machine — Portable Bluetooth Thermal Printer with Tape", brandPool: ["LabelPro", "TagIt", "PrintSmart", "OrganiZen", "NeatNest"] },
          { titleTemplate: "Pantry Label Set — 180 Preprinted Waterproof Minimalist Kitchen Labels", brandPool: ["TagIt", "LabelPro", "PantryPro", "OrganiZen", "NeatNest"] },
        ],
      },
      {
        name: "Shoe Storage",
        products: [
          { titleTemplate: "Clear Shoe Boxes — 12-Pack Stackable Drop Front Sneaker Display Cases", brandPool: ["ShoeCrate", "ClearStack", "TidyHome", "DisplayPro", "NeatNest"] },
          { titleTemplate: "Under Bed Shoe Organizer — 2-Pack 16-Pair Adjustable Divider Storage", brandPool: ["BedStore", "ShoeCrate", "SpaceSmart", "TidyHome", "NeatNest"] },
          { titleTemplate: "Shoe Rack — 4-Tier Bamboo Bench with Boot Holder for Entryway", brandPool: ["NeatNest", "ShoeCrate", "TidyHome", "BambooHome", "SpaceSmart"] },
        ],
      },
    ],
  },
  {
    category: "Sports Recovery & Wellness",
    priceRange: [14.99, 89.99],
    marginRange: [0.30, 0.55],
    subcategories: [
      {
        name: "Massage Guns",
        products: [
          { titleTemplate: "Mini Massage Gun — Deep Tissue Percussion with 6 Heads & Carry Case", brandPool: ["RecoverPro", "MuscleRelief", "PulseFit", "BodyWorks", "DeepHit"] },
          { titleTemplate: "Massage Gun Attachment Set — 15-Piece Heads for Deep Tissue & Fascia", brandPool: ["PulseFit", "RecoverPro", "MuscleRelief", "HeadSwap", "BodyWorks"] },
          { titleTemplate: "Handheld Back Massager — Shiatsu Neck & Shoulder with Heat Therapy", brandPool: ["BodyWorks", "RecoverPro", "MuscleRelief", "HeatWave", "PulseFit"] },
        ],
      },
      {
        name: "Ice Packs & Wraps",
        products: [
          { titleTemplate: "Gel Ice Pack Set — 3-Pack Reusable Hot Cold Therapy for Knee & Shoulder", brandPool: ["CoolWrap", "IceRelief", "RecoverPro", "ChillPack", "FreezeEase"] },
          { titleTemplate: "Ice Pack Knee Wrap — Gel Bead Compression Sleeve with Adjustable Strap", brandPool: ["IceRelief", "CoolWrap", "RecoverPro", "JointEase", "FreezeEase"] },
        ],
      },
      {
        name: "Compression Sleeves",
        products: [
          { titleTemplate: "Copper Compression Knee Sleeves — 2-Pack Support Brace for Running", brandPool: ["CopperFlex", "JointGuard", "RecoverPro", "CompressFit", "ActiveKnee"] },
          { titleTemplate: "Calf Compression Sleeves — 2-Pack Graduated Support for Shin Splints", brandPool: ["CompressFit", "CopperFlex", "RecoverPro", "LegGuard", "ActiveRun"] },
          { titleTemplate: "Elbow Compression Sleeve — 2-Pack with Gel Pad for Tennis Elbow", brandPool: ["JointGuard", "CopperFlex", "RecoverPro", "CompressFit", "ArmEase"] },
        ],
      },
      {
        name: "Yoga Blocks",
        products: [
          { titleTemplate: "Yoga Block Set — 2-Pack High Density EVA Foam with Strap", brandPool: ["ZenFlex", "YogaCraft", "FlowFit", "PoseRight", "BalanceBlock"] },
          { titleTemplate: "Cork Yoga Blocks — 2-Pack Non-Slip Natural Cork with Rounded Edges", brandPool: ["CorkZen", "ZenFlex", "YogaCraft", "FlowFit", "NaturalPose"] },
        ],
      },
      {
        name: "Acupressure Mats",
        products: [
          { titleTemplate: "Acupressure Mat & Pillow Set — Organic Cotton with 7992 Pressure Points", brandPool: ["PressurePoint", "ZenMat", "RecoverPro", "NeedleRest", "AcuRelief"] },
          { titleTemplate: "Acupressure Foot Mat — Reflexology Pad with Magnetic Therapy Stones", brandPool: ["FootRelief", "PressurePoint", "ZenMat", "AcuRelief", "SoleMaster"] },
        ],
      },
      {
        name: "Posture Correctors",
        products: [
          { titleTemplate: "Posture Corrector — Adjustable Back Brace for Men & Women with Padding", brandPool: ["PosturePro", "BackAlign", "SpineRight", "RecoverPro", "StandTall"] },
          { titleTemplate: "Posture Trainer — Smart Vibration Reminder Device with App Tracking", brandPool: ["SpineRight", "PosturePro", "BackAlign", "SmartPosture", "AlignTech"] },
        ],
      },
      {
        name: "Kinesiology Tape",
        products: [
          { titleTemplate: "Kinesiology Tape — 2-Pack Uncut Rolls Waterproof Athletic Support", brandPool: ["FlexTape", "KineticBand", "RecoverPro", "SportWrap", "TapeRelief"] },
          { titleTemplate: "Pre-Cut Kinesiology Tape — 40-Strip Athletic Tape for Knee Shoulder Back", brandPool: ["KineticBand", "FlexTape", "RecoverPro", "SportWrap", "QuickTape"] },
          { titleTemplate: "Kinesiology Tape Kit — 3 Rolls with Application Guide & Scissors", brandPool: ["RecoverPro", "FlexTape", "KineticBand", "SportWrap", "TapeRelief"] },
        ],
      },
    ],
  },
  {
    category: "Camping & Hiking",
    priceRange: [12.99, 79.99],
    marginRange: [0.25, 0.55],
    subcategories: [
      {
        name: "Headlamps & Flashlights",
        products: [
          { titleTemplate: "Rechargeable Headlamp — 1200 Lumen LED with 8 Modes & Red Light", brandPool: ["TrailBeam", "LumenPro", "HikeBright", "CampGlow", "NightTrail"] },
          { titleTemplate: "Tactical Flashlight — 2000 Lumen Zoomable LED with 5 Modes", brandPool: ["LumenPro", "TrailBeam", "BeamForce", "HikeBright", "FlashMax"] },
          { titleTemplate: "Camping Lantern — Rechargeable LED with Power Bank & 4 Light Modes", brandPool: ["CampGlow", "TrailBeam", "LumenPro", "LanternKing", "HikeBright"] },
        ],
      },
      {
        name: "Camp Cookware",
        products: [
          { titleTemplate: "Camping Cookware Set — 14-Piece Aluminum Pot Pan for 2-3 People", brandPool: ["TrailChef", "CampCook", "OutdoorMeal", "FireSide", "HikeBite"] },
          { titleTemplate: "Titanium Camping Mug — 450ml Double Wall with Folding Handle & Lid", brandPool: ["TitanCup", "TrailChef", "CampCook", "LightGear", "OutdoorMeal"] },
        ],
      },
      {
        name: "Water Filtration",
        products: [
          { titleTemplate: "Water Filter Straw — Personal Portable Purifier 0.01 Micron 4-Stage", brandPool: ["PureStream", "FilterHike", "AquaTrail", "CleanSip", "WaterSafe"] },
          { titleTemplate: "Gravity Water Filter — 3L Camping Purifier Bag with Carbon Filter", brandPool: ["AquaTrail", "PureStream", "FilterHike", "CampPure", "WaterSafe"] },
          { titleTemplate: "Water Purification Tablets — 100-Count Chlorine Dioxide Emergency Supply", brandPool: ["PureTab", "AquaTrail", "PureStream", "SafeWater", "FilterHike"] },
        ],
      },
      {
        name: "Fire Starters",
        products: [
          { titleTemplate: "Ferro Rod Fire Starter — 5/16 Inch Thick with Paracord Handle & Scraper", brandPool: ["SparkTrail", "FireCraft", "IgnitePro", "BushSpark", "FlintKing"] },
          { titleTemplate: "Waterproof Matches — 4-Box Set Stormproof with Extended Burn Time", brandPool: ["StormMatch", "FireCraft", "SparkTrail", "IgnitePro", "SurviveFire"] },
        ],
      },
      {
        name: "Camping Chairs",
        products: [
          { titleTemplate: "Ultralight Camp Chair — Backpacking Chair 2 lbs with Carry Bag", brandPool: ["SitLite", "CampComfort", "TrailSeat", "PackChair", "LightRest"] },
          { titleTemplate: "Folding Camping Chair — Oversized Padded with Cup Holder & Cooler", brandPool: ["CampComfort", "SitLite", "ChillSeat", "TrailSeat", "OutdoorLux"] },
        ],
      },
      {
        name: "Dry Bags",
        products: [
          { titleTemplate: "Waterproof Dry Bag Set — 3-Pack Roll Top Sack for Kayaking & Rafting", brandPool: ["DryTrail", "AquaGuard", "PackDry", "WaterShield", "RiverPack"] },
          { titleTemplate: "Dry Bag Backpack — 25L Waterproof Roll Top with Padded Straps", brandPool: ["AquaGuard", "DryTrail", "WaterShield", "PackDry", "RiverPack"] },
          { titleTemplate: "Phone Dry Bag — 2-Pack Universal Waterproof Pouch with Lanyard", brandPool: ["PhoneDry", "AquaGuard", "DryTrail", "WaterShield", "SealCase"] },
        ],
      },
      {
        name: "Multi-Tools",
        products: [
          { titleTemplate: "Camping Multi-Tool — 14-in-1 Stainless Steel with Sheath & Belt Clip", brandPool: ["ToolTrail", "MultiCraft", "CampBlade", "SurvivePro", "EdgeMaster"] },
          { titleTemplate: "Survival Card Tool — 18-in-1 Credit Card Size Stainless Steel EDC", brandPool: ["CardTool", "ToolTrail", "SurvivePro", "EDCMaster", "MultiCraft"] },
        ],
      },
    ],
  },
  {
    category: "Kids & Educational",
    priceRange: [9.99, 49.99],
    marginRange: [0.35, 0.65],
    subcategories: [
      {
        name: "STEM Kits",
        products: [
          { titleTemplate: "Electronics Kit for Kids — 335-Piece Snap Circuits with Light & Sound", brandPool: ["BrainSpark", "STEMGenius", "KidLab", "LearnPlay", "ScienceWhiz"] },
          { titleTemplate: "Robot Building Kit — Programmable STEM Toy with Remote Control 12-in-1", brandPool: ["RoboKid", "BrainSpark", "STEMGenius", "BuildBot", "KidLab"] },
          { titleTemplate: "Crystal Growing Kit — 20 Experiments Science Lab for Kids Ages 8-12", brandPool: ["ScienceWhiz", "BrainSpark", "CrystalLab", "KidLab", "STEMGenius"] },
        ],
      },
      {
        name: "Art Supplies for Kids",
        products: [
          { titleTemplate: "Kids Art Set — 150-Piece Deluxe Drawing Kit in Wooden Case", brandPool: ["LittleArtist", "ColorKid", "CraftJoy", "ArtStar", "KidCreate"] },
          { titleTemplate: "Washable Finger Paints — 12 Colors Non-Toxic Tempera for Toddlers", brandPool: ["ColorKid", "LittleArtist", "PaintPlay", "CraftJoy", "TinyHands"] },
        ],
      },
      {
        name: "Learning Games",
        products: [
          { titleTemplate: "Sight Words Flash Card Game — 220 Dolch Words with Reward Stickers", brandPool: ["ReadyMind", "LearnPlay", "BrainSpark", "WordWiz", "SmartKid"] },
          { titleTemplate: "Math Dice Game — Mental Math Practice for Ages 6-10 with Score Pad", brandPool: ["MathWhiz", "BrainSpark", "LearnPlay", "NumberFun", "SmartKid"] },
          { titleTemplate: "Geography Board Game — World Map Puzzle with Country Facts & Flags", brandPool: ["WorldKid", "BrainSpark", "MapMaster", "LearnPlay", "GeoGenius"] },
        ],
      },
      {
        name: "Flash Cards",
        products: [
          { titleTemplate: "Multiplication Flash Cards — 144 Self-Checking Cards with Ring Holder", brandPool: ["FlashGenius", "MathWhiz", "BrainSpark", "LearnPlay", "CardSmart"] },
          { titleTemplate: "Alphabet Flash Cards — 52 Double-Sided ABC Cards with Real Photos", brandPool: ["ABCKid", "FlashGenius", "LearnPlay", "BrainSpark", "ReadyMind"] },
        ],
      },
      {
        name: "Building Sets",
        products: [
          { titleTemplate: "Magnetic Building Tiles — 120-Piece Set with Wheels Windows & Figures", brandPool: ["MagBuild", "TileCraft", "KidConstruct", "BrainSpark", "SnapTile"] },
          { titleTemplate: "Wooden Building Blocks — 100-Piece Natural Hardwood Set with Canvas Bag", brandPool: ["WoodBlock", "KidConstruct", "NaturBuild", "BrainSpark", "TimberToy"] },
          { titleTemplate: "Interlocking Gear Set — 150-Piece Spinning Gears Construction Toy", brandPool: ["GearKid", "BrainSpark", "BuildSpin", "KidConstruct", "STEMGenius"] },
        ],
      },
      {
        name: "Science Experiments",
        products: [
          { titleTemplate: "Volcano Science Kit — 15 Experiments with Erupting Volcano Model", brandPool: ["ScienceWhiz", "BrainSpark", "LabKid", "ExploreMore", "KidLab"] },
          { titleTemplate: "Microscope Kit for Kids — 40X-1200X with Prepared Slides & Specimens", brandPool: ["MicroKid", "ScienceWhiz", "BrainSpark", "KidLab", "ZoomLens"] },
        ],
      },
      {
        name: "Sensory Toys",
        products: [
          { titleTemplate: "Sensory Fidget Toys — 30-Pack Stress Relief Set for ADHD & Autism", brandPool: ["FidgetPro", "CalmKid", "SensorPlay", "BrainSpark", "QuietHands"] },
          { titleTemplate: "Kinetic Sand Set — 3 lbs with 10 Molds & Inflatable Sand Tray", brandPool: ["SandPlay", "SensorPlay", "CalmKid", "TactileJoy", "BrainSpark"] },
          { titleTemplate: "Water Beads Kit — 100000 Beads with 10 Balloons & Scooping Tools", brandPool: ["BeadPlay", "SensorPlay", "CalmKid", "SplashFun", "BrainSpark"] },
        ],
      },
    ],
  },
  {
    category: "Car & Vehicle",
    priceRange: [9.99, 69.99],
    marginRange: [0.30, 0.55],
    subcategories: [
      {
        name: "Phone Mounts",
        products: [
          { titleTemplate: "Car Phone Mount — Dashboard Suction Cup Holder with 360° Rotation", brandPool: ["DriveGrip", "AutoMount", "RoadView", "CarClamp", "MountPro"] },
          { titleTemplate: "Magnetic Phone Mount — Air Vent Clip with Strong N52 Magnets", brandPool: ["MagDrive", "AutoMount", "DriveGrip", "VentSnap", "CarClamp"] },
          { titleTemplate: "Wireless Car Charger Mount — 15W Auto-Clamping with Air Vent Clip", brandPool: ["ChargeRide", "DriveGrip", "AutoMount", "PowerDrive", "MountPro"] },
        ],
      },
      {
        name: "Seat Organizers",
        products: [
          { titleTemplate: "Car Seat Gap Filler — 2-Pack Console Side Pocket with Cup Holder", brandPool: ["GapFill", "AutoTidy", "DriveOrg", "SeatPocket", "CarNeat"] },
          { titleTemplate: "Back Seat Organizer — 2-Pack with Tablet Holder & 9 Storage Pockets", brandPool: ["AutoTidy", "GapFill", "KidRide", "SeatPocket", "CarNeat"] },
        ],
      },
      {
        name: "Cleaning Kits",
        products: [
          { titleTemplate: "Car Detailing Kit — 25-Piece Interior Cleaning Set with Microfiber Towels", brandPool: ["DetailPro", "AutoShine", "CarGlow", "CleanRide", "ShineCraft"] },
          { titleTemplate: "Car Vacuum — Handheld 12V Wet/Dry with HEPA Filter & Accessories", brandPool: ["AutoVac", "CleanRide", "DetailPro", "CarGlow", "DustDrive"] },
          { titleTemplate: "Windshield Cleaning Tool — Extendable Microfiber Wiper with Spray Bottle", brandPool: ["GlassPro", "AutoShine", "ClearView", "CleanRide", "WindoWipe"] },
        ],
      },
      {
        name: "Emergency Tools",
        products: [
          { titleTemplate: "Car Emergency Kit — Roadside Assistance Set with Jumper Cables & Flashlight", brandPool: ["RoadReady", "SafeDrive", "EmergencyPro", "AutoGuard", "RescueKit"] },
          { titleTemplate: "Car Window Breaker — 2-Pack Safety Hammer with Seatbelt Cutter", brandPool: ["SafeDrive", "RoadReady", "BreakFree", "AutoGuard", "EscapePro"] },
        ],
      },
      {
        name: "Trunk Organizers",
        products: [
          { titleTemplate: "Collapsible Trunk Organizer — 3-Compartment with Cooler & Lid Cover", brandPool: ["TrunkTidy", "AutoTidy", "CargoFit", "CarNeat", "DriveOrg"] },
          { titleTemplate: "Cargo Net — Heavy Duty Stretch Mesh for SUV Truck & Van", brandPool: ["CargoFit", "TrunkTidy", "NetPro", "AutoTidy", "HoldFast"] },
        ],
      },
      {
        name: "Sun Shades",
        products: [
          { titleTemplate: "Windshield Sun Shade — Foldable Umbrella Type with UV Protection", brandPool: ["ShadeDrive", "CoolCar", "SunBlock", "AutoCool", "UVGuard"] },
          { titleTemplate: "Car Window Shades — 4-Pack Side Window Sun Visor with Suction Cups", brandPool: ["CoolCar", "ShadeDrive", "SunBlock", "AutoCool", "KidShade"] },
          { titleTemplate: "Rear Windshield Sunshade — Mesh Screen with Static Cling No Suction Cups", brandPool: ["SunBlock", "ShadeDrive", "CoolCar", "MeshShade", "AutoCool"] },
        ],
      },
      {
        name: "LED Lights",
        products: [
          { titleTemplate: "Car Interior LED Lights — 4-Strip RGB Ambient Lighting with App Control", brandPool: ["GlowRide", "LEDDrive", "AutoGlow", "LightCar", "RGBRide"] },
          { titleTemplate: "LED Headlight Bulbs — H11 6000K Cool White 300% Brighter Pair", brandPool: ["BrightDrive", "LEDDrive", "BeamMax", "AutoGlow", "LightForce"] },
        ],
      },
    ],
  },
  {
    category: "Home Decor & Lighting",
    priceRange: [12.99, 79.99],
    marginRange: [0.30, 0.60],
    subcategories: [
      {
        name: "LED String Lights",
        products: [
          { titleTemplate: "Fairy Lights — 100ft 300 LED Warm White with 8 Modes & Remote", brandPool: ["GlowNest", "LightCraft", "SparkleHome", "LuminArt", "TwinkleJoy"] },
          { titleTemplate: "Globe String Lights — 50ft G40 Outdoor Patio Lights with 25 Bulbs", brandPool: ["PatioGlow", "GlowNest", "LightCraft", "BulbFest", "SparkleHome"] },
          { titleTemplate: "Curtain Fairy Lights — 300 LED Window Icicle Lights with Timer", brandPool: ["LuminArt", "GlowNest", "CurtainGlow", "SparkleHome", "TwinkleJoy"] },
        ],
      },
      {
        name: "Candle Holders",
        products: [
          { titleTemplate: "Glass Candle Holder Set — 3-Pack Mercury Votive Cups with Tealights", brandPool: ["FlameGlow", "CandleCraft", "GlassNest", "WickHome", "LuminArt"] },
          { titleTemplate: "Wall Sconce Candle Holder — 2-Pack Wrought Iron with Glass Cups", brandPool: ["IronGlow", "FlameGlow", "CandleCraft", "WallLight", "WickHome"] },
        ],
      },
      {
        name: "Wall Art Hardware",
        products: [
          { titleTemplate: "Picture Hanging Kit — 225-Piece Assorted Wall Hooks Nails & Wire", brandPool: ["HangRight", "WallCraft", "ArtMount", "PicturePro", "NailIt"] },
          { titleTemplate: "Command Strip Alternatives — 60-Pack Heavy Duty Adhesive Hooks No Damage", brandPool: ["StickPro", "HangRight", "WallCraft", "NoNail", "ArtMount"] },
          { titleTemplate: "Gallery Wall Template Set — 8-Frame Layout with Paper Templates & Level", brandPool: ["GalleryPro", "WallCraft", "HangRight", "FrameIt", "ArtMount"] },
        ],
      },
      {
        name: "Throw Pillows",
        products: [
          { titleTemplate: "Velvet Throw Pillow Covers — 4-Pack 18x18 Inch with Hidden Zipper", brandPool: ["CushionCraft", "PillowNest", "SoftHome", "VelvetLux", "CozyDecor"] },
          { titleTemplate: "Outdoor Pillow Covers — 4-Pack Waterproof 18x18 with Geometric Print", brandPool: ["PatioComfort", "CushionCraft", "OutdoorLux", "PillowNest", "WeatherSoft"] },
        ],
      },
      {
        name: "Picture Frames",
        products: [
          { titleTemplate: "Picture Frame Set — 10-Pack Gallery Wall Frames Multi-Size Black", brandPool: ["FrameNest", "GalleryPro", "WallCraft", "MemoryFrame", "PicturePro"] },
          { titleTemplate: "Floating Shelves — 3-Pack Rustic Wood with Invisible Bracket for Photos", brandPool: ["ShelfCraft", "FrameNest", "WallCraft", "RusticHome", "FloatMount"] },
        ],
      },
      {
        name: "Desk Lamps",
        products: [
          { titleTemplate: "LED Desk Lamp — Dimmable with USB Port 5 Color Modes & Touch Control", brandPool: ["LightDesk", "LuminArt", "StudyGlow", "BrightWork", "DeskCraft"] },
          { titleTemplate: "Clip-On Book Light — Rechargeable LED Reading Lamp with 3 Brightness", brandPool: ["ReadGlow", "LightDesk", "LuminArt", "ClipBright", "StudyGlow"] },
          { titleTemplate: "Architect Desk Lamp — Adjustable Swing Arm with Clamp & Metal Shade", brandPool: ["DeskCraft", "LightDesk", "LuminArt", "ArmLight", "BrightWork"] },
        ],
      },
      {
        name: "Decorative Storage",
        products: [
          { titleTemplate: "Woven Storage Baskets — 3-Pack Cotton Rope Bins with Handles", brandPool: ["BasketNest", "WeaveHome", "CozyDecor", "StorageCraft", "RopeBox"] },
          { titleTemplate: "Decorative Book Boxes — 3-Pack Faux Leather Stacking Storage Boxes", brandPool: ["BookBox", "BasketNest", "DecorVault", "CozyDecor", "StorageCraft"] },
          { titleTemplate: "Floating Wall Shelf with Drawer — Rustic Wood Bedside Table Organizer", brandPool: ["ShelfCraft", "RusticHome", "WallCraft", "CozyDecor", "FloatMount"] },
        ],
      },
    ],
  },
];

// ── Deterministic product generation ──────────────────────────────

function generateProducts(count: number): MockProduct[] {
  const rng = mulberry32(42_420_516); // fixed seed for deterministic output
  const products: MockProduct[] = [];
  const usedAsins = new Set<string>(HAND_CRAFTED.map((p) => p.asin));

  // Flatten all category/subcategory/product-template combos
  interface FlatTemplate {
    category: string;
    subcategory: string;
    priceRange: [number, number];
    marginRange: [number, number];
    template: ProductTemplate;
  }

  const flatTemplates: FlatTemplate[] = [];
  for (const cat of CATEGORY_DEFS) {
    for (const sub of cat.subcategories) {
      for (const tmpl of sub.products) {
        flatTemplates.push({
          category: cat.category,
          subcategory: sub.name,
          priceRange: cat.priceRange,
          marginRange: cat.marginRange,
          template: tmpl,
        });
      }
    }
  }

  // Title variation modifiers to make each product unique
  const prefixes = [
    "Premium", "Professional", "Deluxe", "Ultra", "Pro-Grade", "Heavy-Duty",
    "Upgraded", "Advanced", "Elite", "Compact", "Portable", "Ergonomic",
    "All-in-One", "Multi-Purpose", "High-Performance", "Industrial-Grade",
    "Extra-Large", "Mini", "Lightweight", "Eco-Friendly",
  ];
  const suffixes = [
    "— 2024 New Model", "— Latest Version", "— Bestseller", "— Top Rated",
    "with Bonus Accessories", "with Carrying Case", "with Warranty Card",
    "— Gift Set Edition", "— Family Size", "— Travel Edition",
    "for Home & Office", "for Beginners & Pros", "— Value Pack",
    "— Bundle Deal", "with Quick-Start Guide", "— Space-Saving Design",
    "with Free Replacement Parts", "— FDA Approved Materials",
    "— Customer Favorite", "— Limited Edition",
  ];

  /** Generate a deterministic ASIN not already used */
  function genAsin(): string {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let asin: string;
    do {
      asin = "B0";
      for (let i = 0; i < 8; i++) {
        asin += chars[Math.floor(rng() * chars.length)];
      }
    } while (usedAsins.has(asin));
    usedAsins.add(asin);
    return asin;
  }

  /** Random float in [min, max] */
  function randRange(min: number, max: number): number {
    return min + rng() * (max - min);
  }

  /** Random int in [min, max] */
  function randInt(min: number, max: number): number {
    return Math.floor(randRange(min, max + 1));
  }

  /** Pick a random item from an array */
  function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(rng() * arr.length)];
  }

  /** Bimodal review count distribution for realistic competition spread */
  function logNormalReviews(): number {
    const roll = rng();
    if (roll < 0.40) {
      // Low competition opportunities: 50-500 reviews
      return Math.max(50, Math.min(500, Math.round(50 + rng() * 450)));
    } else if (roll < 0.75) {
      // Medium competition: 500-3000 reviews
      return Math.max(500, Math.min(3000, Math.round(500 + rng() * 2500)));
    } else {
      // High competition leaders: 3000-50000 reviews
      const u1 = rng();
      const u2 = rng();
      const z = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);
      const logVal = 8.5 + z * 0.8;
      return Math.max(3000, Math.min(50000, Math.round(Math.exp(logVal))));
    }
  }

  /** Rating weighted toward 3.5–4.3 */
  function weightedRating(): number {
    // Use beta-ish distribution: average of multiple uniforms
    const r = (rng() + rng() + rng()) / 3; // clusters around 0.5
    const rating = 2.8 + r * 2.0; // 2.8 to 4.8, clustered around 3.8
    return Math.round(rating * 10) / 10;
  }

  /** Opportunity score with bell curve centered around 60 */
  function bellCurveScore(): number {
    const r = (rng() + rng() + rng() + rng()) / 4; // strong central tendency
    const score = 15 + r * 83; // 15 to 98, centered ~56
    return Math.round(score);
  }

  /** Derive tier from score */
  function tierFromScore(score: number): Tier {
    if (score >= 90) return "S";
    if (score >= 75) return "A";
    if (score >= 50) return "B";
    if (score >= 25) return "C";
    return "D";
  }

  /** Derive recommendation from tier */
  function recommendationFromTier(tier: Tier): Recommendation {
    switch (tier) {
      case "S": return "strong_buy";
      case "A": return "buy";
      case "B": return "watch";
      case "C": return "avoid";
      case "D": return "avoid";
    }
  }

  /** Break score into 4 sub-scores summing to total, each 0–25 */
  function breakdownScore(total: number): ScoreBreakdown {
    // Distribute total across 4 buckets with some randomness
    const raw = [rng(), rng(), rng(), rng()];
    const sum = raw.reduce((a, b) => a + b, 0);
    const normalized = raw.map((r) => (r / sum) * total);

    // Clamp each to 0–25 and adjust
    const clamped = normalized.map((v) => Math.max(0, Math.min(25, Math.round(v))));
    let diff = total - clamped.reduce((a, b) => a + b, 0);

    // Distribute remainder
    for (let i = 0; diff !== 0 && i < 4; i++) {
      const adjust = diff > 0 ? 1 : -1;
      if (clamped[i] + adjust >= 0 && clamped[i] + adjust <= 25) {
        clamped[i] += adjust;
        diff -= adjust;
      }
    }

    return {
      demandScore: clamped[0],
      competitionScore: clamped[1],
      marginScore: clamped[2],
      sentimentScore: clamped[3],
    };
  }

  for (let i = 0; i < count; i++) {
    const tmpl = flatTemplates[i % flatTemplates.length];
    const asin = genAsin();

    // Build a unique title with prefix/suffix variation
    const prefixIdx = Math.floor(rng() * prefixes.length);
    const suffixIdx = Math.floor(rng() * suffixes.length);
    const usePrefix = rng() > 0.3; // 70% chance of prefix
    const useSuffix = rng() > 0.4; // 60% chance of suffix

    let title = tmpl.template.titleTemplate;
    if (usePrefix) {
      // Replace first word or prepend
      title = prefixes[prefixIdx] + " " + title;
    }
    if (useSuffix) {
      title = title + " " + suffixes[suffixIdx];
    }

    const brand = pick(tmpl.template.brandPool);
    const price = Math.round(randRange(tmpl.priceRange[0], tmpl.priceRange[1]) * 100) / 100;
    const rating = weightedRating();
    const reviewCount = logNormalReviews();
    const bsr = randInt(20, 15000);

    // Monthly sales inversely related to BSR (with noise)
    const salesBase = Math.round(300000 / (bsr + 50) * (0.7 + rng() * 0.6));
    const estimatedMonthlySales = Math.max(50, Math.min(30000, salesBase));
    const estimatedMonthlyRevenue = Math.round(price * estimatedMonthlySales);
    const profitMarginEstimate = Math.round(randRange(tmpl.marginRange[0], tmpl.marginRange[1]) * 100) / 100;

    // Score and derived fields
    const score = bellCurveScore();
    const tier = tierFromScore(score);
    const recommendation = recommendationFromTier(tier);
    const scoreBreakdown = breakdownScore(score);

    // Analysis status: 90% complete, 5% pending, 3% processing, 2% failed
    const statusRoll = rng();
    let analysisStatus: MockProduct["analysisStatus"];
    if (statusRoll < 0.90) analysisStatus = "complete";
    else if (statusRoll < 0.95) analysisStatus = "pending";
    else if (statusRoll < 0.98) analysisStatus = "processing";
    else analysisStatus = "failed";

    products.push({
      id: asin,
      asin,
      title,
      brand,
      category: tmpl.category,
      subcategory: tmpl.subcategory,
      price,
      rating,
      reviewCount,
      bsr,
      imageUrl: "",
      estimatedMonthlySales,
      estimatedMonthlyRevenue,
      profitMarginEstimate,
      opportunityScore: analysisStatus === "complete" ? score : null,
      tier: analysisStatus === "complete" ? tier : null,
      recommendation: analysisStatus === "complete" ? recommendation : null,
      scoreBreakdown: analysisStatus === "complete" ? scoreBreakdown : null,
      analysisStatus,
    });
  }

  return products;
}

// ── Combined product list ─────────────────────────────────────────

export const MOCK_PRODUCTS: MockProduct[] = [
  ...HAND_CRAFTED,
  ...generateProducts(10000),
];

// ── Analysis result (for product detail page) ─────────────────────

export const MOCK_ANALYSIS: Record<string, AnalysisResult> = {
  B0BFWK4TMR: {
    complaints: [
      {
        issue: "Adjustment mechanism jams after 3-6 months of regular use",
        frequency: "very_common",
        severity: "critical",
        exampleQuotes: [
          "The dial got stuck at 30 lbs and won't budge anymore",
          "After 4 months the selector mechanism completely failed",
          "Adjustment plate cracked internally — now it's a very expensive paperweight",
        ],
      },
      {
        issue: "Weight plates rattle and feel loose during exercises",
        frequency: "common",
        severity: "major",
        exampleQuotes: [
          "Plates clank around during curls, very distracting",
          "There's noticeable play in the plates even when locked",
        ],
      },
      {
        issue: "Handle grip wears out and becomes slippery with sweat",
        frequency: "common",
        severity: "major",
        exampleQuotes: [
          "The rubber coating started peeling after just 2 months",
          "Very slippery when my hands are sweaty, almost dropped it on my foot",
        ],
      },
      {
        issue: "Cradle/stand is flimsy plastic and tips over easily",
        frequency: "occasional",
        severity: "minor",
        exampleQuotes: [
          "The stand feels cheap compared to the dumbbells themselves",
          "My cradle broke when I set the dumbbell down slightly off-center",
        ],
      },
      {
        issue: "Inaccurate weight — actual weight doesn't match selected increment",
        frequency: "occasional",
        severity: "major",
        exampleQuotes: [
          "Weighed it on a scale, 35 lb setting was actually 31.2 lbs",
          "Inconsistent weight between left and right dumbbell at same setting",
        ],
      },
      {
        issue: "Large footprint — wider than traditional dumbbells",
        frequency: "occasional",
        severity: "minor",
        exampleQuotes: [
          "These are really bulky even at the lightest setting",
        ],
      },
    ],
    featureRequests: [
      { feature: "Metal cradle/stand instead of plastic", demandLevel: "high", mentionCount: 340 },
      { feature: "Knurled steel handle for better grip", demandLevel: "high", mentionCount: 280 },
      { feature: "More precise 2.5 lb increments below 25 lbs", demandLevel: "medium", mentionCount: 150 },
      { feature: "Compact version for smaller spaces", demandLevel: "medium", mentionCount: 120 },
      { feature: "Built-in rep counter / Bluetooth connectivity", demandLevel: "low", mentionCount: 45 },
    ],
    productGaps: [
      {
        gap: "Adjustment mechanism durability is the #1 failure point across all competitors",
        opportunity: "Engineer a reinforced steel selector mechanism with lifetime warranty",
        competitiveAdvantage: "First adjustable dumbbell with provably reliable mechanism — dominates long-term reviews",
      },
      {
        gap: "No competitor offers a truly compact adjustable dumbbell under 10\" length",
        opportunity: "Design a column-style mechanism that reduces footprint by 40%",
        competitiveAdvantage: "Only option for apartment dwellers and small home gyms",
      },
      {
        gap: "Handle ergonomics are an afterthought — smooth chrome or cheap rubber",
        opportunity: "Invest in knurled, sweat-wicking handle with contoured grip",
        competitiveAdvantage: "Premium feel differentiator that shows in every unboxing video",
      },
    ],
    sentimentBreakdown: { positive: 38, neutral: 24, negative: 38 },
    opportunitySummary:
      "The adjustable dumbbell market at the $100-200 price point is massive ($450M+ annually) but plagued by a universal durability problem — the adjustment mechanism. Every major competitor (Bowflex, NordicTrack, PowerBlock) suffers from the same failure mode after 3-12 months. A product that solves the mechanism reliability issue while offering a more compact form factor could capture significant share from frustrated repeat buyers.",
    improvementIdeas: [
      "Replace plastic selector components with hardened steel cam mechanism rated for 50,000+ cycles",
      "Add knurled stainless steel handle with moisture-wicking channel grooves and ergonomic contour",
      "Redesign as column-lock system reducing footprint to under 10\" at minimum weight",
      "Include heavy-duty powder-coated steel cradle instead of injection-molded plastic stand",
      "Implement magnetic weight-lock indicator that confirms correct weight is engaged before lift",
    ],
    keyThemes: [
      "Mechanism durability",
      "Grip quality",
      "Space efficiency",
      "Weight accuracy",
      "Build quality",
      "Cradle design",
      "Long-term reliability",
    ],
  },
  B09V3KXJPB: {
    complaints: [
      {
        issue: "Small garlic cloves don't press well — fall through holes",
        frequency: "very_common",
        severity: "major",
        exampleQuotes: [
          "Small cloves just get stuck and nothing comes through",
          "Only works with large cloves, useless for small ones",
        ],
      },
      {
        issue: "Difficult to clean — garlic gets stuck in holes and hinges",
        frequency: "very_common",
        severity: "critical",
        exampleQuotes: [
          "Takes longer to clean than to actually mince garlic by hand",
          "Even with the included brush, garlic residue is impossible to remove",
          "Not dishwasher safe despite the listing claiming it is",
        ],
      },
      {
        issue: "Handle pinches fingers during pressing",
        frequency: "common",
        severity: "major",
        exampleQuotes: [
          "Pinched my palm every single time I used it",
          "The handles come together at an angle that catches skin",
        ],
      },
      {
        issue: "Hinge loosens over time and wobbles",
        frequency: "occasional",
        severity: "minor",
        exampleQuotes: [
          "After a few months the hinge got really loose",
        ],
      },
      {
        issue: "Chrome plating chips and exposes base metal",
        frequency: "occasional",
        severity: "minor",
        exampleQuotes: [
          "The chrome started flaking off after just a month of use",
        ],
      },
    ],
    featureRequests: [
      { feature: "Integrated self-cleaning mechanism", demandLevel: "high", mentionCount: 420 },
      { feature: "Wider chamber for multiple clove sizes", demandLevel: "high", mentionCount: 310 },
      { feature: "Soft-grip non-slip handles", demandLevel: "medium", mentionCount: 180 },
      { feature: "Peeler attachment included", demandLevel: "low", mentionCount: 60 },
    ],
    productGaps: [
      {
        gap: "No garlic press on the market has a truly effective self-cleaning design",
        opportunity: "Create a swing-out plate that ejects garlic residue with one motion",
        competitiveAdvantage: "Solves the #1 complaint across all garlic presses — cleaning",
      },
      {
        gap: "Chamber size is one-size-fits-all but garlic cloves vary wildly",
        opportunity: "Dual-chamber design with interchangeable fine/coarse plates",
        competitiveAdvantage: "Versatility that justifies premium pricing",
      },
    ],
    sentimentBreakdown: { positive: 45, neutral: 22, negative: 33 },
    opportunitySummary:
      "Garlic presses are a high-volume, impulse-buy category where brand loyalty is nearly zero. The universal pain points — cleaning difficulty and inconsistent pressing for different clove sizes — remain unsolved across all price tiers. A product with a genuinely innovative self-cleaning mechanism could dominate the category through viral social content alone.",
    improvementIdeas: [
      "Design a hinged swing-out pressing plate that allows garlic residue to be wiped off in one swipe",
      "Create dual-depth chamber with removable fine and coarse pressing plates",
      "Add silicone-wrapped ergonomic handles with finger guards to prevent pinching",
      "Use solid 18/10 stainless steel construction — no chrome plating that chips",
      "Include a built-in peeler sleeve and storage clip that attaches to the handle",
    ],
    keyThemes: [
      "Cleaning difficulty",
      "Clove size compatibility",
      "Handle ergonomics",
      "Build material",
      "Versatility",
      "Dishwasher safety",
    ],
  },
};

// ── Helpers ───────────────────────────────────────────────────────

export function getMockTableProducts(): TableProduct[] {
  return MOCK_PRODUCTS.map((p) => ({
    id: p.id,
    asin: p.asin,
    title: p.title,
    category: p.category,
    price: p.price,
    rating: p.rating,
    reviewCount: p.reviewCount,
    bsr: p.bsr,
    opportunityScore: p.opportunityScore,
    tier: p.tier,
    recommendation: p.recommendation,
    analysisStatus: p.analysisStatus,
  }));
}

export function getMockProduct(asin: string): MockProduct | undefined {
  return MOCK_PRODUCTS.find((p) => p.asin === asin || p.id === asin);
}

export function getMockAnalysis(productId: string): AnalysisResult | undefined {
  return MOCK_ANALYSIS[productId];
}

// ── Aggregate stats ───────────────────────────────────────────────

export function getMockStats() {
  const products = MOCK_PRODUCTS;
  const scored = products.filter((p) => p.opportunityScore !== null);

  const avgScore = scored.length > 0
    ? Math.round(scored.reduce((s, p) => s + (p.opportunityScore ?? 0), 0) / scored.length)
    : 0;

  const tierCounts: Record<string, number> = {};
  for (const p of scored) {
    if (p.tier) tierCounts[p.tier] = (tierCounts[p.tier] ?? 0) + 1;
  }

  const categoryCounts: Record<string, number> = {};
  for (const p of products) {
    categoryCounts[p.category] = (categoryCounts[p.category] ?? 0) + 1;
  }

  const totalRevenue = products.reduce((s, p) => s + p.estimatedMonthlyRevenue, 0);
  const avgPrice = products.reduce((s, p) => s + p.price, 0) / products.length;
  const avgRating = products.reduce((s, p) => s + p.rating, 0) / products.length;
  const totalReviews = products.reduce((s, p) => s + p.reviewCount, 0);

  // Trend data — 12 months with realistic growth curve
  const trendMonths = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const trendScores = [42, 45, 48, 51, 53, 55, 58, 62, 67, 71, 76, avgScore];
  const growthCurve = [0.04, 0.06, 0.09, 0.13, 0.18, 0.25, 0.35, 0.48, 0.62, 0.78, 0.90, 1.0];
  const trendProducts = growthCurve.map((pct) => Math.round(pct * products.length));

  return {
    totalProducts: products.length,
    analyzedProducts: scored.length,
    avgScore,
    tierCounts,
    categoryCounts,
    totalRevenue,
    avgPrice: Math.round(avgPrice * 100) / 100,
    avgRating: Math.round(avgRating * 10) / 10,
    totalReviews,
    trendMonths,
    trendScores,
    trendProducts,
    sProducts: tierCounts["S"] ?? 0,
    aProducts: tierCounts["A"] ?? 0,
    bProducts: tierCounts["B"] ?? 0,
  };
}
