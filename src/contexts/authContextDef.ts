import { createContext } from 'react';
import type { User } from 'firebase/auth';
import type { AppUser } from '../types/schema';

export interface AuthContextType {
    user: User | null;
    appUser: AppUser | null; // Database user with roles
    loading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    appUser: null,
    loading: true,
    login: async () => { },
    logout: async () => { }
});
