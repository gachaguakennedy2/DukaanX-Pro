import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import type { AppUser } from '../types/schema';
import { AuthContext } from './authContextDef';
import { provisionCompanyUser } from '../lib/provisionUser';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            setUser(u);

            if (u) {
                void provisionCompanyUser(u.uid, u.email || '', {
                    companyId: 'demo-company',
                    defaultBranchId: 'branch-1',
                    defaultRole: 'OWNER',
                });

                // TODO: Fetch real user from Firestore
                // const docSnap = await getDoc(doc(db, 'users', u.uid));
                // setAppUser(docSnap.data() as AppUser);

                // MOCK APP USER FOR SPRINT 1
                setAppUser({
                    uid: u.uid,
                    email: u.email || '',
                    role: 'OWNER',
                    branchIds: ['branch-1'],
                    isActive: true,
                    createdAt: new Date()
                });
            } else {
                setAppUser(null);
            }

            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = async (email: string, pass: string) => {
        // For Sprint 1, allow a "mock" login if Firebase keys aren't real yet
        // OR actually try firebase. 
        // Since user likely hasn't put api keys, we'll implement a bypass for "admin@orbit.com"
        if (email === 'admin@orbit.com' && pass === 'password') {
            // Mock successful auth state trigger (simulated)
            const mockFirebaseUser = { uid: 'mock-admin', email } as User;
            setUser(mockFirebaseUser);
            setAppUser({
                uid: 'mock-admin',
                email,
                role: 'OWNER',
                branchIds: ['branch-1'],
                isActive: true,
                createdAt: new Date()
            });
            return;
        }

        await signInWithEmailAndPassword(auth, email, pass);
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
        setAppUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, appUser, loading, login, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
