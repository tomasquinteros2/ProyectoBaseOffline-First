export interface VentaItem {
    id: number;
    productoId: number;
    productoDescripcion: string;
    cantidad: number;
    precioUnitario: number;
}

export interface Venta {
    id: number;
    numeroComprobante: string;
    fechaVenta: string;
    totalVenta: number;
    items: VentaItem[];
}