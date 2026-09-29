import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import {
  initializeFirestore, getFirestore, Firestore,
  persistentLocalCache, persistentMultipleTabManager,
  connectFirestoreEmulator,
} from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(cfg)

export const auth = getAuth(app)

let _firestore: Firestore
try {
  _firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
    // Better on flaky mobile networks; costs a bit more battery.
    experimentalAutoDetectLongPolling: true,
  })
} catch {
  // HMR reload — Firestore was already initialized. Reuse the existing instance.
  _firestore = getFirestore(app)
}
export const firestore = _firestore

export const storage = getStorage(app)

const USE_EMULATORS = import.meta.env.VITE_USE_EMULATORS === 'true'
if (USE_EMULATORS) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
  connectFirestoreEmulator(firestore, 'localhost', 8080)
  connectStorageEmulator(storage, 'localhost', 9199)
}
