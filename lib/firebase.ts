import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore,
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  Firestore
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  projectId: "effortless-complex-4cf5x",
  appId: "1:5158052190:web:ad687f8d69ec3b59abafcf",
  apiKey: "AIzaSyAOzZhYw-99me2b8p2o224Z8Fx1I1jU4jg",
  authDomain: "effortless-complex-4cf5x.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-rohitquizflash-5f261794-5b3c-4f09-885d-fe0486c6b282",
  storageBucket: "effortless-complex-4cf5x.firebasestorage.app",
  messagingSenderId: "5158052190",
  measurementId: ""
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, "ai-studio-rohitquizflash-5f261794-5b3c-4f09-885d-fe0486c6b282");
} catch (e) {
  try {
    firestoreInstance = getFirestore(app, "ai-studio-rohitquizflash-5f261794-5b3c-4f09-885d-fe0486c6b282");
  } catch (err) {
    firestoreInstance = getFirestore(app);
  }
}

export const db = firestoreInstance;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Validates connection to Firestore as per system skills guidelines.
 */
export async function testFirestoreConnection() {
  try {
    // Attempt to fetch an allowed document to verify connectivity without permission errors
    await getDocFromServer(doc(db, 'settings', 'quiz_config'));
    console.log("Firestore connection verified.");
  } catch (error: any) {
    // If the error is 'unavailable', it's a network/connection issue
    if (error?.code === 'unavailable') {
      console.warn("Firestore appears to be offline or unreachable. Check your network.");
    } else if (error?.code === 'permission-denied') {
      // This technically proves the server is REACHABLE, but permissions are tight
      console.log("Firestore reachable (Permission Denied for test doc, which is expected for some paths).");
    } else {
      console.error("Firestore connection diagnostic error:", error);
    }
  }
}
