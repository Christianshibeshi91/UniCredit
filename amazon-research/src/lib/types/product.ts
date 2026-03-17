import type { Timestamp } from "firebase/firestore";

export interface Product {
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
  productUrl: string;
  estimatedMonthlySales: number;
  estimatedMonthlyRevenue: number;
  profitMarginEstimate: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Review {
  id: string;
  productId: string;
  reviewerName: string;
  rating: number;
  title: string;
  body: string;
  verifiedPurchase: boolean;
  helpfulVotes: number;
  reviewDate: Timestamp;
  createdAt: Timestamp;
}
