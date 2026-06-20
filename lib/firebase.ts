import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

declare var __firebase_config: any;
declare var __app_id: any;

let app: any = null;
let auth: any = null;
let db: any = null;

const isFirebaseAvailable = typeof window !== 'undefined' && typeof __firebase_config !== 'undefined';
export const appId = typeof __app_id !== 'undefined' ? __app_id : 'local-build';

if (isFirebaseAvailable) {
  try {
    const firebaseConfig = JSON.parse(__firebase_config);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.warn("Backend initialization skipped.");
  }
}

export { app, auth, db };
