import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAuthToken, AuthError } from "@/lib/firebase/auth-admin";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";

// Allowed Claude model values — must match UI dropdown and claudeClient.ts
const ALLOWED_MODELS = new Set([
  "claude-sonnet-4-20250514",
  "claude-opus-4-6",
  "claude-haiku-4-5-20251001",
]);

const DEFAULT_SETTINGS = {
  autoAnalyzeNewProducts: true,
  enableResponseCaching: true,
  claudeModel: "claude-sonnet-4-20250514",
  maxReviewsPerBatch: 50,
  analysisCompletionAlerts: true,
  theme: "dark" as const,
};

interface UserSettings {
  autoAnalyzeNewProducts: boolean;
  enableResponseCaching: boolean;
  claudeModel: string;
  maxReviewsPerBatch: number;
  analysisCompletionAlerts: boolean;
  theme: "light" | "dark";
}

/**
 * GET /api/settings
 * Returns authenticated user's settings, merged with defaults.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request);
    const db = getAdminDb();
    const userDoc = await db.collection("users").doc(auth.uid).get();

    if (!userDoc.exists) {
      // Return defaults if no user doc
      return NextResponse.json({
        ...DEFAULT_SETTINGS,
        updatedAt: new Date().toISOString(),
      });
    }

    const userData = userDoc.data();
    const settings = {
      ...DEFAULT_SETTINGS,
      ...(userData?.settings ?? {}),
    };

    return NextResponse.json({
      ...settings,
      updatedAt: userData?.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("[API /settings] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings
 * Partial update of user settings. Validates field values.
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request);

    let body: Partial<UserSettings>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // Validate fields
    const errors: string[] = [];

    if (body.claudeModel !== undefined && !ALLOWED_MODELS.has(body.claudeModel)) {
      errors.push(`Invalid claudeModel. Allowed: ${Array.from(ALLOWED_MODELS).join(", ")}`);
    }

    if (body.maxReviewsPerBatch !== undefined) {
      if (
        typeof body.maxReviewsPerBatch !== "number" ||
        Number.isNaN(body.maxReviewsPerBatch) ||
        body.maxReviewsPerBatch < 10 ||
        body.maxReviewsPerBatch > 200
      ) {
        errors.push("maxReviewsPerBatch must be a number between 10 and 200");
      }
    }

    if (body.theme !== undefined && body.theme !== "light" && body.theme !== "dark") {
      errors.push("theme must be 'light' or 'dark'");
    }

    if (
      body.autoAnalyzeNewProducts !== undefined &&
      typeof body.autoAnalyzeNewProducts !== "boolean"
    ) {
      errors.push("autoAnalyzeNewProducts must be a boolean");
    }

    if (
      body.enableResponseCaching !== undefined &&
      typeof body.enableResponseCaching !== "boolean"
    ) {
      errors.push("enableResponseCaching must be a boolean");
    }

    if (
      body.analysisCompletionAlerts !== undefined &&
      typeof body.analysisCompletionAlerts !== "boolean"
    ) {
      errors.push("analysisCompletionAlerts must be a boolean");
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors.join("; ") },
        { status: 400 }
      );
    }

    // Build partial update — only include validated fields
    const settingsUpdate: Record<string, unknown> = {};
    const allowedKeys: (keyof UserSettings)[] = [
      "autoAnalyzeNewProducts",
      "enableResponseCaching",
      "claudeModel",
      "maxReviewsPerBatch",
      "analysisCompletionAlerts",
      "theme",
    ];

    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        settingsUpdate[`settings.${key}`] = body[key];
      }
    }

    const now = Timestamp.now();
    const db = getAdminDb();
    const userRef = db.collection("users").doc(auth.uid);

    await userRef.update({
      ...settingsUpdate,
      updatedAt: now,
    });

    // Return merged settings
    const updatedDoc = await userRef.get();
    const updatedSettings = {
      ...DEFAULT_SETTINGS,
      ...(updatedDoc.data()?.settings ?? {}),
    };

    return NextResponse.json({
      settings: updatedSettings,
      updatedAt: now.toDate().toISOString(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("[API /settings] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
