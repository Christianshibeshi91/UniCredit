import {
  initializeApp,
  getApps,
  cert,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_ADMIN_PROJECT_ID, " +
        "FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY environment variables."
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

let _adminApp: App | null = null;
let _adminDb: Firestore | null = null;

export function getAdminDb(): Firestore {
  if (!_adminDb) {
    _adminApp = getAdminApp();
    _adminDb = getFirestore(_adminApp);
  }
  return _adminDb;
}

/** @deprecated Use getAdminDb() instead — kept for backward compat */
export const adminDb = new Proxy({} as Firestore, {
  get(_target, prop, receiver) {
    return Reflect.get(getAdminDb(), prop, receiver);
  },
});
