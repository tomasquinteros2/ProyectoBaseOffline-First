import { useState, useEffect, type ReactNode, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { Box, CircularProgress } from '@mui/material';
import { AuthContext, type AuthContextType } from './auth-context';

const UNAUTHORIZED_EVENT = 'app:unauthorized';

interface DecodedToken {
    sub: string;
    auth: string;
    exp: number;
    iat: number;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [role, setRole] = useState<string>('USER');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        localStorage.removeItem('authToken');
        setToken(null);
        setRole('USER');
        setIsAuthenticated(false);
    }, []);

    useEffect(() => {
        const handleUnauthorized = () => {
            console.warn('Evento de no autorizado recibido. Cerrando sesión.');
            logout();
        };

        window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);

        return () => {
            window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
        };
    }, [logout]);

    useEffect(() => {
        try {
            const storedToken = localStorage.getItem('authToken');
            if (storedToken) {
                const decoded: DecodedToken = jwtDecode(storedToken);
                if (decoded.exp * 1000 > Date.now()) {
                    setToken(storedToken);
                    setRole(decoded.auth || 'USER');
                    setIsAuthenticated(true);
                } else {
                    logout();
                }
            }
        } catch (error) {
            console.error("Error al procesar el token inicial, limpiando.", error);
            logout();
        } finally {
            setLoading(false);
        }
    }, [logout]);

    const login = (newToken: string) => {
        try {
            const decoded: DecodedToken = jwtDecode(newToken);
            localStorage.setItem('authToken', newToken);
            setToken(newToken);
            setRole(decoded.auth || 'USER');
            setIsAuthenticated(true);
        } catch (error) {
            console.error("Intento de login con token inválido.", error);
            logout();
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    const value: AuthContextType = { token, role, login, logout, isAuthenticated };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}