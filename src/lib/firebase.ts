import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";

// Your web app's Firebase configuration
// Using Vite environment variables (VITE_ prefixed)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID || ""}-default-rtdb.firebaseio.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

// Check if firebase is configured
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId
);

let db: any = null;

if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
  } catch (error) {
    console.error("Failed to initialize Firebase Realtime Database:", error);
  }
} else {
  console.warn("Firebase config is missing. Please set VITE_FIREBASE_* environment variables.");
}

export { db };

export async function subscribeToNewsletter(email: string): Promise<{ success: boolean; message?: string }> {
  if (!isFirebaseConfigured || !db) {
    // If not configured, mock success but print warn
    console.warn("Firebase not configured. Simulating newsletter subscription in database for:", email);
    return { 
      success: false, 
      message: "Firebase is not configured. Please add your VITE_FIREBASE_* environment variables to a .env file." 
    };
  }

  // 5-second timeout to prevent hanging when offline or firebase is unreachable
  const timeoutPromise = new Promise<{ success: boolean; message?: string }>((_, reject) =>
    setTimeout(() => reject(new Error("Network timeout. Saving offline.")), 5000)
  );

  try {
    const savePromise = (async () => {
      const safeEmailKey = email.replace(/\./g, "<dot>").replace("@", "<at>");
      const subscribersRef = ref(db, `subscribers/${safeEmailKey}`);
      const formattedTimestamp = new Date().toISOString();
      await set(subscribersRef, formattedTimestamp);
      return { success: true };
    })();

    return await Promise.race([savePromise, timeoutPromise]);
  } catch (error: any) {
    console.error("Error saving email to Firebase Realtime Database:", error);
    return { success: false, message: error.message || "Failed to save email to Firebase Realtime Database." };
  }
}
