import apiClient from './apiClient';
import type { CartItem } from '../context/CartProvider';
import type { Venta } from '../types/Venta';


interface VentaPayloadItem {
    id: number;
    cantidad: number;
}

export const registrarVenta = async (cartItems: CartItem[]): Promise<Venta> => {
    const payload: VentaPayloadItem[] = cartItems.map(item => ({
        id: item.product.id as number,
        cantidad: item.quantity,
    }));
    const { data } = await apiClient.post('/producto/ventas/registrar', { items: payload });
    return data;
};

export const fetchVentas = async (): Promise<Venta[]> => {
    try {
        const { data } = await apiClient.get('/producto/ventas');

        if (Array.isArray(data)) {
            return data;
        }

        console.warn("La respuesta de /ventas no fue un array. Se devolverá una lista vacía para proteger la UI.");
        return [];

    } catch (err) {
        console.error('Error al obtener el historial de ventas. Se devolverá una lista vacía.', err);
        return [];
    }
};

export const fetchVentaByNumero = async (numero: string): Promise<Venta> => {
    const { data } = await apiClient.get(`/producto/ventas/comprobante/${numero}`);
    return data;
};
