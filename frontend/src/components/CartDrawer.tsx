import {
    Box, Button, Divider, Drawer, IconButton, List, ListItem,
    ListItemText, Typography, TextField, Tooltip, CircularProgress,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { useCart, type CartItem } from '../context/CartProvider';
import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useMutation, useQueryClient, onlineManager } from '@tanstack/react-query';
import { registrarVenta } from '../api/salesApi';
import type { Venta } from '../types/Venta';
import type { Producto } from '../types/Producto';
import ReceiptModal from './ReceiptModal';

interface CartDrawerProps {
    open: boolean;
    onClose: () => void;
}

type VentaMutationContext = {
    previousProducts?: Producto[];
};

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
    const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart();
    const queryClient = useQueryClient();

    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [completedVenta, setCompletedVenta] = useState<Venta | null>(null);

    const cartTotal = useMemo(() => {
        return cartItems.reduce((total, item) => {
            const itemPrice = item.product.precio_publico ?? 0;
            return total + (itemPrice * item.quantity);
        }, 0);
    }, [cartItems]);

    const ventaMutation = useMutation<Venta, Error, CartItem[], VentaMutationContext>({
        mutationKey: ['registrarVenta'],
        mutationFn: registrarVenta,
        onMutate: async (newVentaItems) => {
            await queryClient.cancelQueries({ queryKey: ['products'] });
            const previousProducts = queryClient.getQueryData<Producto[]>(['products']);
            queryClient.setQueryData<Producto[]>(['products'], (oldProducts = []) => {
                return oldProducts.map(p => {
                    const itemInCart = newVentaItems.find(item => item.product.id === p.id);
                    if (itemInCart) {
                        return { ...p, cantidad: p.cantidad - itemInCart.quantity };
                    }
                    return p;
                });
            });
            return { previousProducts };
        },
        onSuccess: (data) => {
            toast.success(`Venta N° ${data.numeroComprobante} registrada.`, { id: 'venta-toast' });
            setCompletedVenta(data);
            clearCart();
            onClose();
        },
        onError: (error, _variables, context) => {
            if (context?.previousProducts) {
                queryClient.setQueryData(['products'], context.previousProducts);
            }
            toast.error(`Falló la operación: ${error.message}`, { id: 'venta-toast' });
        },
        onSettled: () => {
            if (onlineManager.isOnline()) {
                queryClient.invalidateQueries({ queryKey: ['products'] });
                queryClient.invalidateQueries({ queryKey: ['ventas'] });
            }
        },
    });


    const handleOpenConfirmDialog = () => {
        if (cartItems.length === 0) {
            toast.error("El carrito está vacío.");
            return;
        }
        setIsConfirmDialogOpen(true);
    };

    const handleConfirmCheckout = () => {
        setIsConfirmDialogOpen(false);
        toast.loading("Procesando venta...", { id: 'venta-toast' });
        ventaMutation.mutate(cartItems);
    };

    return (
        <>
            <Drawer anchor="right" open={open} onClose={onClose}>
                <Box sx={{ width: 350, p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">Carrito de Compras</Typography>
                        <IconButton onClick={onClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                    <Divider sx={{ my: 2 }} />

                    {cartItems.length === 0 ? (
                        <Typography sx={{ textAlign: 'center', mt: 4 }}>El carrito está vacío.</Typography>
                    ) : (
                        <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
                            {cartItems.map(item => (
                                <ListItem key={item.product.id} secondaryAction={
                                    <Tooltip title="Quitar del carrito">
                                        <IconButton edge="end" aria-label="delete" onClick={() => removeFromCart(item.product.id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                }>
                                    <ListItemText
                                        primary={item.product.descripcion}
                                        secondary={`$${item.product.precio_publico?.toLocaleString('es-AR', { minimumFractionDigits: 2 }) ?? 'N/D'}`}
                                    />
                                    <TextField
                                        type="number"
                                        size="small"
                                        value={item.quantity}
                                        onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value, 10) || 1)}
                                        inputProps={{ min: 1, max: item.product.cantidad, style: { width: '50px', textAlign: 'center' } }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}

                    <Box sx={{ mt: 'auto' }}>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" sx={{ textAlign: 'right', mb: 2 }}>
                            Total: ${cartTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </Typography>
                        <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            onClick={handleOpenConfirmDialog} // MODIFICADO: Llama a la función que abre el diálogo
                            disabled={cartItems.length === 0 || ventaMutation.isPending}
                        >
                            {ventaMutation.isPending ? <CircularProgress size={24} /> : 'Finalizar Venta'}
                        </Button>
                    </Box>
                </Box>
            </Drawer>

            <Dialog
                open={isConfirmDialogOpen}
                onClose={() => setIsConfirmDialogOpen(false)}
            >
                <DialogTitle>Confirmar Venta</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Está seguro de que desea finalizar la venta por un total de <strong>${cartTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsConfirmDialogOpen(false)} color="secondary">Cancelar</Button>
                    <Button onClick={handleConfirmCheckout} variant="contained" autoFocus>
                        Confirmar
                    </Button>
                </DialogActions>
            </Dialog>

            <ReceiptModal
                open={Boolean(completedVenta)}
                onClose={() => setCompletedVenta(null)}
                venta={completedVenta}
            />
        </>
    );
}