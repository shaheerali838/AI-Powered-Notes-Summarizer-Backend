// src/config/firebaseAdmin.js
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

// Enhanced Firebase Admin initialization with better error handling
let db;
let isInitialized = false;

const initializeFirebase = () => {
  if (isInitialized) {
    return { admin, db };
  }

  try {
    console.log("🔥 Initializing Firebase Admin SDK...");

    // Validate required environment variables
    const requiredEnvVars = [
      "FIREBASE_PROJECT_ID",
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required Firebase environment variables: ${missingVars.join(
          ", "
        )}`
      );
    }

    // Parse private key correctly (handle escaped newlines)
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!privateKey || !privateKey.includes("BEGIN PRIVATE KEY")) {
      throw new Error("Invalid Firebase private key format");
    }

    // Service account configuration
    const serviceAccount = {
      type: process.env.FIREBASE_TYPE || "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri:
        process.env.FIREBASE_AUTH_URI ||
        "https://accounts.google.com/o/oauth2/auth",
      token_uri:
        process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url:
        process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL ||
        "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
      universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || "googleapis.com",
    };

    // Initialize Firebase Admin only if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });

      console.log("✅ Firebase Admin SDK initialized successfully");
    } else {
      console.log("ℹ️ Firebase Admin SDK already initialized");
    }

    // Initialize Firestore
    db = admin.firestore();

    // Configure Firestore settings
    db.settings({
      ignoreUndefinedProperties: true,
      timestampsInSnapshots: true,
    });

    console.log("✅ Firestore initialized successfully");
    isInitialized = true;

    return { admin, db };
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error);
    throw new Error(
      `Firebase Admin SDK initialization failed: ${error.message}`
    );
  }
};

// Initialize Firebase on module load
const { admin: firebaseAdmin, db: firestore } = initializeFirebase();

/**
 * Enhanced Firebase Auth verification middleware
 * Supports both authenticated users and guest users
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided - treat as guest user
      req.user = null;
      req.isGuest = true;
      console.log("ℹ️ Request without auth token - treating as guest");
      return next();
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      req.user = null;
      req.isGuest = true;
      return next();
    }

    try {
      // Verify the Firebase ID token
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);

      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        displayName: decodedToken.name,
        photoURL: decodedToken.picture,
        isAnonymous: decodedToken.firebase?.sign_in_provider === "anonymous",
        provider: decodedToken.firebase?.sign_in_provider,
        authTime: new Date(decodedToken.auth_time * 1000),
        issuedAt: new Date(decodedToken.iat * 1000),
        expiresAt: new Date(decodedToken.exp * 1000),
      };

      req.isGuest = decodedToken.firebase?.sign_in_provider === "anonymous";

      console.log(
        `✅ Token verified for user: ${req.user.uid} (${
          req.isGuest ? "guest" : "authenticated"
        })`
      );
    } catch (tokenError) {
      console.error("❌ Token verification failed:", tokenError);

      // Invalid token - treat as guest
      req.user = null;
      req.isGuest = true;

      // Don't fail the request for invalid tokens, just log it
      console.log("⚠️ Invalid token provided - treating as guest user");
    }

    next();
  } catch (error) {
    console.error("❌ Auth middleware error:", error);

    // On auth middleware error, continue as guest
    req.user = null;
    req.isGuest = true;
    next();
  }
};

/**
 * Middleware that requires authenticated user (non-guest)
 */
export const requireAuth = (req, res, next) => {
  if (!req.user || req.isGuest) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
      message: "This endpoint requires user authentication",
      errorCode: "AUTH_REQUIRED",
    });
  }
  next();
};

/**
 * Middleware that allows both authenticated and guest users
 */
export const allowGuests = (req, res, next) => {
  // This middleware just passes through - it's for documentation
  // Both authenticated and guest users are allowed
  next();
};

/**
 * Get user's Firestore document reference
 */
export const getUserDocRef = (userId) => {
  if (!userId) {
    throw new Error("User ID is required");
  }
  return firestore.collection("users").doc(userId);
};

/**
 * Get user's summaries collection reference
 */
export const getUserSummariesRef = (userId) => {
  if (!userId) {
    throw new Error("User ID is required");
  }
  return firestore.collection("users").doc(userId).collection("summaries");
};

/**
 * Health check for Firebase connection
 */
export const checkFirebaseHealth = async () => {
  try {
    // Test Firestore connection
    await firestore.collection("_health").limit(1).get();

    // Test Auth connection
    await firebaseAdmin.auth().listUsers(1);

    return {
      firestore: "healthy",
      auth: "healthy",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Firebase health check failed:", error);
    return {
      firestore: "error",
      auth: "error",
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

// Export the initialized instances
export { firebaseAdmin as admin, firestore as db };
