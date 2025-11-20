import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { CssBaseline, ThemeProvider, createTheme, Box, CircularProgress } from '@mui/material';
import { Toaster } from 'react-hot-toast';

import ViewerAdminRoute from './components/ViewerAdminRoute';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ProductListPage = lazy(() => import('./pages/ProductListPage'));
const ProductFormPage = lazy(() => import('./pages/ProductFormPage'));
const SalesHistoryPage = lazy(() => import('./pages/SalesHistoryPage'));
const ProveedorListPage = lazy(() => import('./pages/ProveedorListPage'));
const ProveedorFormPage = lazy(() => import('./pages/ProveedorFormPage'));
const RubroListPage = lazy(() => import('./pages/RubroListPage'));
const RubroFormPage = lazy(() => import('./pages/RubroFormPage'));

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#4caf50' },
        secondary: { main: '#ff9100' },
        background: { default: '#121212', paper: '#1e1e1e' }
    },
});

const SuspenseFallback = () => (
    <Box display="flex" justifyContent="center" alignItems="center" sx={{ p: 4, height: '100vh' }}>
        <CircularProgress />
    </Box>
);

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Toaster
                position="bottom-center"
                toastOptions={{ style: { background: '#333', color: '#fff' } }}
            />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Suspense fallback={<SuspenseFallback />}>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />

                        <Route element={<ProtectedRoute />}>
                            <Route element={<AppLayout />}>
                                <Route path="/" element={<ProductListPage />} />
                                <Route path="/ventas" element={<SalesHistoryPage />} />

                                <Route element={<AdminRoute />}>
                                    <Route path="/productos/nuevo" element={<ProductFormPage />} />
                                    <Route path="/productos/editar/:id" element={<ProductFormPage />} />
                                </Route>

                                <Route element={<ViewerAdminRoute />}>
                                    <Route path="/rubros" element={<RubroListPage />} />
                                    <Route path="/proveedores" element={<ProveedorListPage />} />
                                </Route>

                                <Route element={<AdminRoute />}>
                                    <Route path="/rubros/nuevo" element={<RubroFormPage />} />
                                    <Route path="/rubros/editar/:id" element={<RubroFormPage />} />
                                    <Route path="/proveedores/nuevo" element={<ProveedorFormPage />} />
                                    <Route path="/proveedores/editar/:id" element={<ProveedorFormPage />} />
                                </Route>
                            </Route>
                        </Route>
                    </Routes>
                </Suspense>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;