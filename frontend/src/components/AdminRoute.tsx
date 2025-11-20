import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';

const AdminRoute = () => {
    const { role } = useAuth();

    if (role !== 'ADMIN') {
        toast.error("Acceso denegado. No tienes permisos de administrador.");
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default AdminRoute;