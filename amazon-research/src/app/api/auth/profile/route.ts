import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAuthToken, AuthError } from "@/lib/firebase/auth-admin";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";

const DEFAULT_SETTINGS = {
  autoAnalyzeNewProducts: true,
  enableResponseCaching: true,
  claudeModel: "claude-sonnet-4-20250514",
  maxReviewsPerBatch: 50,
  analysisCompletionAlerts: true,
  theme: "dark" as const,
};

/**
 * GET /api/auth/profile
 * Returns the authenticated user's profile.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request);
    const db = getAdminDb();
    const userDoc = await db.collection("users").doc(auth.uid).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(userDoc.data());
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("[API /auth/profile] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/profile
 * Create or update user profile on sign-in.
 * Creates with defaults if the user doc doesn't exist.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request);

    let body: { displayName?: string; email?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // Validate email format (basic check)
    const email = body.email ?? auth.email;
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    // Sanitize displayName — strip any HTML tags
    const rawDisplayName = body.displayName ?? email.split("@")[0];
    const displayName = rawDisplayName.replace(/<[^>]*>/g, "").slice(0, 100);

    const db = getAdminDb();
    const userRef = db.collection("users").doc(auth.uid);
    const existingDoc = await userRef.get();

    const now = Timestamp.now();

    if (existingDoc.exists) {
      // Update lastLoginAt only
      await userRef.update({
        lastLoginAt: now,
        updatedAt: now,
      });
    } else {
      // Create new user document with defaults
      await userRef.set({
        uid: auth.uid,
        email,
        displayName,
        photoURL: null,
        authProvider: auth.token.firebase?.sign_in_provider === "google.com" ? "google" : "email",
        settings: DEFAULT_SETTINGS,
        productsAdded: 0,
        analysesRun: 0,
        intelligenceReportsRun: 0,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });
    }

    const userDoc = await userRef.get();

    return NextResponse.json({
      uid: auth.uid,
      email,
      displayName,
      createdAt: userDoc.data()?.createdAt?.toDate()?.toISOString() ?? now.toDate().toISOString(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("[API /auth/profile] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create/update profile" },
      { status: 500 }
    );
  }
}
