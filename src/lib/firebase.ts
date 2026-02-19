import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// TODO: Replace with actual config provided by user
const firebaseConfig = {
    apiKey: "PLACEHOLDER_API_KEY",
    authDomain: "placeholder-app.firebaseapp.com",
    projectId: "placeholder-app",
    storageBucket: "placeholder-app.appspot.com",
    messagingSenderId: "000000000",
    appId: "1:00000000:web:00000000"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const functions = getFunctions(app);

export default app;
