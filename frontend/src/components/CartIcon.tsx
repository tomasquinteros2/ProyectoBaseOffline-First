import { useState } from 'react';
import { Badge, IconButton } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useCart } from '../context/CartProvider';
import CartDrawer from './CartDrawer';

export default function CartIcon() {
    const { totalItems } = useCart();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <>
            <IconButton color="inherit" onClick={() => setIsDrawerOpen(true)}>
                <Badge badgeContent={totalItems} color="secondary">
                    <ShoppingCartIcon />
                </Badge>
            </IconButton>
            <CartDrawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
        </>
    );
}