import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { AppUser } from '../types/schema';
import { firestore } from './firebase';

type ProvisionOptions = {
    companyId: string;
    defaultBranchId: string;
    defaultRole?: AppUser['role'];
};

export async function provisionCompanyUser(uid: string, email: string, opts: ProvisionOptions) {
    const role = opts.defaultRole ?? 'OWNER';
    const userRef = doc(firestore, 'companies', opts.companyId, 'users', uid);

    try {
        const snap = await getDoc(userRef);
        if (snap.exists()) return;

        await setDoc(
            userRef,
            {
                uid,
                email,
                role,
                branchIds: [opts.defaultBranchId],
                isActive: true,
                createdAt: serverTimestamp(),
            },
            { merge: true }
        );
    } catch (e) {
        // If firebase isn't configured yet, don't break login.
        console.warn('Failed to provision company user doc', e);
    }
}
