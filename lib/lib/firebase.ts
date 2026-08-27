import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
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

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
