'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

/**
 * Firebase Web client (for member Phone Auth / OTP).
 *
 * These values are the public web app config for the `chitwise-appfinity`
 * Firebase project — the SAME project the Flutter org app uses. Firebase web
 * config keys are not secrets (they are shipped to every browser); access is
 * controlled by Firebase Auth settings + authorized domains. Env overrides are
 * supported for flexibility across environments.
 */
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDT6N37z_HA62IecgBU9BClQZW-1K7M3uY',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'chitwise-appfinity.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'chitwise-appfinity',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'chitwise-appfinity.firebasestorage.app',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '119768990242',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:119768990242:web:e757305143c4013c47007b',
};

export function getFirebaseApp(): FirebaseApp {
    return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
    const auth = getAuth(getFirebaseApp());
    auth.useDeviceLanguage();
    return auth;
}
