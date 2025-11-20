import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';

const ViewerAdminRoute = () => {
    const { role } = useAuth();

    if (role !== 'ADMIN' && role !== 'VIEWER') {
        toast.error("Acceso denegado. No tienes permisos para acceder a esta sección.");
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ViewerAdminRoute;
