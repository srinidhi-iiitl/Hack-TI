import admin from 'firebase-admin';

function isMissingFirebaseValue(value) {
  return !value || /^your-|placeholder/i.test(String(value).trim());
}

/**
 * Initialize Firebase Admin SDK
 * Used for Firebase Authentication token verification.
 */
export const initializeFirebase = () => {
  console.log('[Firebase Admin] Initialization requested');

  if (admin.apps.length > 0) {
    console.log('[Firebase Admin] Already initialized');
    return admin;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  console.log('Firebase Project ID:', process.env.FIREBASE_PROJECT_ID);
  console.log('Firebase Client Email Exists:', !!process.env.FIREBASE_CLIENT_EMAIL);
  console.log('Firebase Private Key Exists:', !!process.env.FIREBASE_PRIVATE_KEY);
  console.log('[Firebase Admin] Env check', {
    hasProjectId: !isMissingFirebaseValue(projectId),
    hasPrivateKey: !isMissingFirebaseValue(privateKey),
    hasClientEmail: !isMissingFirebaseValue(clientEmail),
  });

  if (
    isMissingFirebaseValue(projectId) ||
    isMissingFirebaseValue(privateKey) ||
    isMissingFirebaseValue(clientEmail)
  ) {
    throw new Error('Firebase Admin environment variables are missing or still contain placeholder values');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      privateKey,
      clientEmail,
    }),
    projectId,
  });

  console.log('[Firebase Admin] SDK initialized successfully');
  return admin;
};

/**
 * Verify Firebase ID token
 * Validates tokens from Firebase Authentication using firebase-admin.
 */
export const verifyFirebaseToken = async (token) => {
  try {
    console.log('[Firebase Admin] Verifying Firebase ID token');

    if (admin.apps.length === 0) {
      console.log('[Firebase Admin] No initialized app found before verifyIdToken; initializing now');
      initializeFirebase();
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('[Firebase Admin] Firebase ID token verified', {
      uid: decodedToken.uid,
      email: decodedToken.email,
    });
    return decodedToken;
  } catch (error) {
    throw new Error(`Invalid Firebase token: ${error.message}`);
  }
};

export default initializeFirebase;
