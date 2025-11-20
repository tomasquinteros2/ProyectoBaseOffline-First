import apiClient from './apiClient';
import type { Producto, Proveedor, TipoProducto, RelatedProductResult,Page } from '../types/Producto';
import type { SyncStatus } from '../types/Sync';
import type {QueryClient} from "@tanstack/react-query";

export interface ProductPayload {
    codigoProducto: string;
    descripcion: string;
    cantidad: number;
    proveedorId: number;
    tipoProductoId: number;
    porcentaje_ganancia: number;
    iva: number;
    resto?: number | null;
    costoFijo: boolean;
    precio_sin_iva?: number;
    costo_pesos?: number;
}
export interface TipoProductoPayload {
    nombre: string;
}
export interface ProveedorPayload {
    nombre: string;
    contacto?: string;
}
export interface ProductRelationPayload {
    productoId: number;
    productoRelacionadoId: number;
}

// === FUNCIONES DE QUERY (LEER DATOS) ===

export const fetchProducts = async (
    page: number,
    size: number,
    searchTerm?: string,
    proveedorId?: string,
    tipoId?: string,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
): Promise<Page<Producto>> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('size', String(size));

    const sortFieldMap: Record<string, string> = {
        'codigoProducto': 'codigoProducto',
        'descripcion': 'descripcion',
        'cantidad': 'cantidad',
        'precio_publico': 'precio_publico',
        'costo_pesos': 'costo_pesos',
        'costo_dolares': 'costo_dolares',
        'porcentaje_ganancia': 'porcentaje_ganancia',
        'iva': 'iva',
        'precio_sin_iva': 'precio_sin_iva',
        'id': 'id'
    };

    let sortParam = 'id,desc';
    if (sortBy && sortOrder) {
        const backendField = sortFieldMap[sortBy] ?? 'id';
        sortParam = `${backendField},${sortOrder}`;
    }

    if (searchTerm?.trim()) {
        const trimmedTerm = searchTerm.trim();
        if (/^\d+$/.test(trimmedTerm)) {
            params.append('id', trimmedTerm);
            params.append('codigoProducto', trimmedTerm);
        } else {
            params.append('descripcion', trimmedTerm);
            params.append('codigoProducto', trimmedTerm);
        }
    }

    if (proveedorId) params.append('proveedorId', proveedorId);
    if (tipoId) params.append('tipoId', tipoId);

    const url = `/producto/productos?${params.toString()}&sort=${sortParam}`;

    const { data } = await apiClient.get<Page<Producto>>(url);

    return data ?? {
        content: [],
        totalPages: 0,
        totalElements: 0,
        number: 0,
        size: size,
    };
};



export const fetchAllProductsForExport = async (): Promise<Producto[]> => {
    const { data } = await apiClient.get('/producto/productos/');
    return data ?? [];
};

export const fetchProductById = async (id: string): Promise<Producto> => {
    const { data } = await apiClient.get(`/producto/productos/${id}`);
    return data;
};
export const createProduct = async (payload: ProductPayload): Promise<Producto> => {
    const { data } = await apiClient.post('/producto/productos', payload);
    return data;
};

export const updateProduct = async ({ id, payload }: { id: string, payload: ProductPayload }): Promise<Producto> => {
    console.log('Updating product with id:', id, 'and payload:', payload);
    const { data } = await apiClient.put(`/producto/productos/${id}`, payload);
    return data;
};

export const deleteProduct = async (productId: number | string): Promise<void> => {
    if (typeof productId === 'number' && productId > 1000000000000) {
        return;
    }
    await apiClient.delete(`/producto/productos/${productId}`);
};

export async function deleteMultipleProducts(ids: (number | string)[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    const payload = ids.map(id => Number(id));
    await apiClient.delete('/producto/productos/delete-multiple', {
        data: payload,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}
// === PROVEEDORES ===
export const fetchProveedores = async (): Promise<Proveedor[]> => {
    const { data } = await apiClient.get('/proveedor/proveedores');
    return data ?? [];
};

export const fetchTiposProducto = async (): Promise<TipoProducto[]> => {
    const { data } = await apiClient.get('/tipo-producto/tiposproducto');
    return data ?? [];
};
export const createTipoProducto = async (tipoProducto: TipoProductoPayload): Promise<TipoProducto> => {
    const { data } = await apiClient.post('/tipo-producto/tiposproducto', tipoProducto);
    return data;
};
export const createBulkTiposProducto = async (tiposProducto: TipoProductoPayload[]): Promise<TipoProducto[]> => {
    const { data } = await apiClient.post('/tipo-producto/tiposproducto/bulk', tiposProducto);
    return data;
};
export const fetchTipoProductoById = async (id: string): Promise<TipoProducto> => {
    const { data } = await apiClient.get(`/tipo-producto/tiposproducto/${id}`);
    return data;
};

export const updateTipoProducto = async ({ id, payload }: { id: string, payload: TipoProductoPayload }): Promise<TipoProducto> => {
    const { data } = await apiClient.put(`/tipo-producto/tiposproducto/${id}`, payload);
    return data;
};

export const deleteTipoProducto = async (id: number): Promise<void> => {
    await apiClient.delete(`/tipo-producto/tiposproducto/${id}`);
};

// === FUNCIONES DE MUTACIÓN (CREAR, ACTUALIZAR, BORRAR) ===

export const relateProducts = async ({ productId, relatedIds }: { productId: number; relatedIds: number[] }): Promise<void> => {
    await apiClient.post(`/producto/productos/${productId}/relacionar`, relatedIds);
};

export const fetchRelatedProducts = async (productId: number | string): Promise<RelatedProductResult[]> => {
    const { data } = await apiClient.get(`/producto/productos/${productId}/relacionados`);
    return data ?? [];
};

export const relateProduct = async (payload: ProductRelationPayload): Promise<void> => {
    await apiClient.post('/producto/productos/relaciones', payload);
};

export const unrelateProduct = async (payload: ProductRelationPayload): Promise<void> => {
    await apiClient.delete('/producto/productos/relaciones', { data: payload });
};

export const bulkUploadProducts = async (products: ProductPayload[]): Promise<void> => {
    await apiClient.post('/producto/productos/cargar-masivo', products);
};

export async function fetchSyncStatus(): Promise<SyncStatus> {
    const endpoints = ['/api/engine/status'];
    let lastError: unknown;

    for (const endpoint of endpoints) {
        try {
            const { data } = await apiClient.get<SyncStatus>(endpoint, {
                headers: { Accept: 'application/json' },
            });
            return data;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError;
}

export async function fetchProductsLastModified(): Promise<{ lastModified: number }> {
    const { data } = await apiClient.get<{ lastModified: number }>('/producto/productos/last-modified');
    return data;
}


