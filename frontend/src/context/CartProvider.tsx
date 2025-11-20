import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { Producto } from '../types/Producto';
import { toast } from 'react-hot-toast';

export interface CartItem {
    product: Producto;
    quantity: number;
}

interface CartContextType {
    cartItems: CartItem[];
    addToCart: (product: Producto) => void;
    removeFromCart: (productId: number | string) => void;
    updateQuantity: (productId: number | string, quantity: number) => void;
    clearCart: () => void;
    totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'ecopila-cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cartItems, setCartItems] = useState<CartItem[]>(() => {
        try {
            const storedItems = localStorage.getItem(CART_STORAGE_KEY);
            return storedItems ? JSON.parse(storedItems) : [];
        } catch (error) {
            console.error("Error al leer el carrito desde localStorage", error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
        } catch (error) {
            console.error("Error al guardar el carrito en localStorage", error);
        }
    }, [cartItems]);


    const addToCart = (product: Producto) => {
        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.product.id === product.id);

            if (existingItem) {
                return prevItems.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prevItems, { product, quantity: 1 }];
        });
        toast.success(`${product.descripcion} añadido al carrito.`);
    };

    const removeFromCart = (productId: number | string) => {
        setCartItems(prevItems => prevItems.filter(item => item.product.id !== productId));
        toast.error("Producto eliminado del carrito.");
    };

    const updateQuantity = (productId: number | string, quantity: number) => {
        setCartItems(prevItems => {
            return prevItems.map(item =>
                item.product.id === productId
                    ? { ...item, quantity: Math.max(1, quantity) }
                    : item
            );
        });
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const totalItems = useMemo(() => {
        return cartItems.reduce((total, item) => total + item.quantity, 0);
    }, [cartItems]);

    const contextValue = useMemo(() => ({
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
    }), [cartItems, totalItems]);

    return (
        <CartContext.Provider value={contextValue}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart debe ser usado dentro de un CartProvider');
    }
    return context;
};