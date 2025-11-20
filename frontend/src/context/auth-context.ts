import { createContext } from 'react';

export interface AuthContextType {
    token: string | null;
    login: (token: string) => void;
    role: string;
    logout: () => void;
    isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);