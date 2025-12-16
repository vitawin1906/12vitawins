// src/components/guards/AdminGuard.tsx
import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated, selectIsAdmin } from '@/stores/authStore';

export function AdminGuard({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore(selectIsAuthenticated);
    const isAdmin = useAuthStore(selectIsAdmin);

    useEffect(() => {
        // ❌ вообще не авторизован → на admin/login
        if (!isAuthenticated) {
            navigate('/admin/login', { replace: true });
            return;
        }

        // ❌ авторизован НО не админ → на /
        if (!isAdmin) {
            navigate('/', { replace: true });
            return;
        }

    }, [isAuthenticated, isAdmin, navigate]);

    if (!isAuthenticated || !isAdmin) return null;

    return <>{children}</>;
}
