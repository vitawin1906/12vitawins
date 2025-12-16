// src/components/guards/UserGuard.tsx
import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';

export function UserGuard({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore(selectIsAuthenticated);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    if (!isAuthenticated) return null;

    return <>{children}</>;
}
