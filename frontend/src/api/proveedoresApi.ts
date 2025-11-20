import type { ProveedorDetallado, ProveedorPayload } from '../types/Proveedor';
import apiClient from './apiClient';

export const fetchProveedoresDetallados = async (): Promise<ProveedorDetallado[]> => {
    const { data } = await apiClient.get('/proveedor/proveedores');
    return data || [];
};

export const fetchProveedorById = async (id: number): Promise<ProveedorDetallado> => {
    const { data } = await apiClient.get(`/proveedor/proveedores/${id}`);
    return data;
};

export const createProveedor = async (payload: ProveedorPayload): Promise<ProveedorDetallado> => {
    const { data } = await apiClient.post('/proveedor/proveedores', payload);
    return data;
};

export const updateProveedor = async ({ id, payload }: { id: number, payload: ProveedorPayload }): Promise<ProveedorDetallado> => {
    console.log('Updating proveedor with id:', id, 'and payload:', payload);
    const { data } = await apiClient.put(`/proveedor/proveedores/${id}`, payload);
    return data;
};

export const deleteProveedor = async (id: number): Promise<void> => {
    await apiClient.delete(`/proveedor/proveedores/${id}`);
};
export async function fetchProveedoresLastModified(): Promise<{ lastModified: number }> {
    const { data } = await apiClient.get<{ lastModified: number }>('/proveedor/proveedores/last-modified');
    return data;
}