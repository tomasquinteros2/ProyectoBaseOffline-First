import { useState, useMemo } from 'react';
import {
    AppBar, Toolbar, Box, Button, Dialog, DialogActions,
    DialogTitle, DialogContent, DialogContentText, Tooltip, IconButton,
    Menu, MenuItem, ListItemIcon, ListItemText
} from '@mui/material';
import { Outlet, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import CartIcon from './CartIcon';
import InventoryIcon from '@mui/icons-material/Inventory';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import BusinessIcon from '@mui/icons-material/Business';
import CategoryIcon from '@mui/icons-material/Category';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import DolarDisplay from './DolarDisplay';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';

function AppLayout() {
    const { logout, role } = useAuth();
    const isAdmin = role === 'ADMIN' || role === 'VIEWER';
    const navigate = useNavigate();
    const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const isMenuOpen = Boolean(anchorEl);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleMenuItemClick = (path: string) => {
        navigate(path);
        handleMenuClose();
    };

    const handleLogoutClick = () => {
        setLogoutDialogOpen(true);
    };

    const handleCloseLogoutDialog = () => {
        setLogoutDialogOpen(false);
    };

    const handleConfirmLogout = () => {
        logout();
        navigate('/login');
        setLogoutDialogOpen(false);
    };

    const menuItems = useMemo(() => {
        const allItems = [
            { text: 'Productos', icon: <InventoryIcon />, path: '/', adminOnly: false },
            { text: 'Proveedores', icon: <BusinessIcon />, path: '/proveedores', adminOnly: true },
            { text: 'Rubros', icon: <CategoryIcon />, path: '/rubros', adminOnly: true },
            { text: 'Historial de Ventas', icon: <PointOfSaleIcon />, path: '/ventas', adminOnly: false },
        ];
        return isAdmin ? allItems : allItems.filter(item => !item.adminOnly);
    }, [isAdmin]);


    return (
        <>
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <AppBar position="static">
                    <Toolbar>
                        <Box sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }}>
                            <IconButton
                                size="large"
                                edge="start"
                                color="inherit"
                                aria-label="abrir menú"
                                onClick={handleMenuOpen}
                            >
                                <MenuIcon />
                            </IconButton>
                            <Menu
                                anchorEl={anchorEl}
                                open={isMenuOpen}
                                onClose={handleMenuClose}
                            >
                                {menuItems.map((item) => (
                                    <MenuItem key={item.text} onClick={() => handleMenuItemClick(item.path)}>
                                        <ListItemIcon>{item.icon}</ListItemIcon>
                                        <ListItemText>{item.text}</ListItemText>
                                    </MenuItem>
                                ))}
                            </Menu>
                        </Box>

                        <Box
                            onClick={() => navigate('/')}
                            sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                            <img
                                src="/logo.png"
                                alt="Logo de Ecopila"
                                style={{ height: '40px', marginRight: '10px' }}
                            />
                        </Box>

                        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'center', gap: 1 }}>
                            {menuItems.map((item) => (
                                <Button
                                    key={item.text}
                                    color="inherit"
                                    component={RouterLink}
                                    to={item.path}
                                    startIcon={item.icon}
                                    sx={{ textTransform: 'none', fontSize: '1rem' }}
                                >
                                    {item.text}
                                </Button>
                            ))}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <DolarDisplay />
                            <ConnectionStatusIndicator />
                            {/* <SyncStatusIndicator /> */}
                            <CartIcon />
                            <Box sx={{ borderLeft: 1, borderColor: 'divider', height: 32, mx: 1 }} />
                            <Tooltip title="Cerrar Sesión">
                                <IconButton color="inherit" onClick={handleLogoutClick}>
                                    <LogoutIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Toolbar>
                </AppBar>
                <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 } }}>
                    <Outlet />
                </Box>
            </Box>

            <Dialog
                open={logoutDialogOpen}
                onClose={handleCloseLogoutDialog}
            >
                <DialogTitle>
                    {"Confirmar Cierre de Sesión"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Estás seguro de que quieres cerrar la sesión?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseLogoutDialog}>Cancelar</Button>
                    <Button onClick={handleConfirmLogout} color="primary" autoFocus>
                        Cerrar Sesión
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default AppLayout;