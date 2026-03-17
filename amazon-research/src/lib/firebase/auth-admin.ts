/**
 * Server-side Firebase Auth token verification.
 * Used by API routes to validate Authorization: Bearer <token> headers.
 */
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getAdminDb } from "./admin";

// Force admin app initialization by accessing the DB
// (getAdminDb initializes the admin app as a side effect)
function getAdminAuth() {
  // Ensure admin app is initialized
  getAdminDb();
  return getAuth();
}

export interface AuthResult {
  uid: string;
  email: string;
  token: DecodedIdToken;
}

/**
 * Verify the Firebase ID token from the Authorization header.
 * Throws an error with status info if verification fails.
 *
 * @param request - The incoming Next.js request
 * @returns The decoded token with uid and email
 */
export async function verifyAuthToken(
  request: Request
): Promise<AuthResult> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid Authorization header", 401);
  }

  const idToken = authHeader.slice(7); // Remove "Bearer " prefix

  if (!idToken || idToken.length < 10) {
    throw new AuthError("Invalid token format", 401);
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email ?? "",
      token: decodedToken,
    };
  } catch (error) {
    // Log server-side for debugging but return generic error to client
    console.error("[Auth] Token verification failed:", error);
    throw new AuthError("Unauthorized", 401);
  }
}

export class AuthError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

export type { DecodedIdToken };
