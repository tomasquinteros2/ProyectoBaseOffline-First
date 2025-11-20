import type {Producto} from '../types/Producto';
import { fetchProveedores } from '../api/productsApi';

export const generateExcelByCategory = async (categoryName: string, products: Producto[]): Promise<void> => {
    const XLSX = await import('xlsx');

    const proveedores = await fetchProveedores();
    const proveedorMap = new Map(proveedores.map(p => [p.id, p.nombre]));

    const excelData = products.map(product => ({
        CODIGO: product.codigoProducto ?? '',
        DESCRIPCION: product.descripcion ?? '',
        PROVEEDOR: proveedorMap.get(product.proveedorId) ?? '',
        'PUBLICO': product.precio_publico ?? '',
        'S/RED': product.precio_sin_redondear ?? '',
        'RESTO': product.resto ?? '',
        'US': product.precio_publico_us ?? '',
        '%GAN': product.porcentaje_ganancia ?? '',
        'COSTO US': product.costo_dolares ?? '',
        IVA: product.iva ? (product.iva + 1) : '',
        'US S/IVA': product.precio_sin_iva ?? '',
        CANTIDAD: product.cantidad ?? '',
        'FECHA ING': product.fecha_ingreso ?? ''
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, categoryName);

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as Uint8Array;
    const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${categoryName}_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

