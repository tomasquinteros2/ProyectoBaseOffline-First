import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Producto } from '../types/Producto';
import { fetchProveedores, fetchTiposProducto } from '../api/productsApi';

export const generatePdfByCategory = async (
    categoryName: string,
    products: Producto[],
    type: 'rubro' | 'proveedor'
) => {
    const doc = new jsPDF();

    const proveedores = await fetchProveedores();
    const tiposProducto = await fetchTiposProducto();
    const proveedorMap = new Map(proveedores.map(p => [p.id, p.nombre]));
    const tipoMap = new Map(tiposProducto.map(t => [t.id, t.nombre]));

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    doc.setFontSize(20);
    doc.text(`Lista de Productos - ${type === 'rubro' ? 'Rubro' : 'Proveedor'}: ${categoryName}`, 14, 22);
    doc.setFontSize(12);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-AR')}`, 14, 32);

    let startY = 40;

    if (type === 'rubro') {
        // Agrupar por proveedor
        const groupedByProveedor = products.reduce((acc, product) => {
            const proveedorId = product.proveedorId;
            if (!acc[proveedorId]) {
                acc[proveedorId] = [];
            }
            acc[proveedorId].push(product);
            return acc;
        }, {} as Record<number, Producto[]>);

        // Generar tabla por cada proveedor
        for (const [proveedorId, productsGroup] of Object.entries(groupedByProveedor)) {
            const proveedorNombre = proveedorMap.get(Number(proveedorId)) ?? 'Proveedor Desconocido';

            doc.setFontSize(14);
            doc.setTextColor(46, 125, 50);
            doc.text(`Proveedor: ${proveedorNombre}`, 14, startY);
            startY += 7;

            const tableData = productsGroup.map(p => [
                p.codigoProducto,
                p.descripcion,
                String(p.cantidad ?? 0),
                formatCurrency(p.precio_publico ?? 0)
            ]);

            autoTable(doc, {
                head: [['Código', 'Descripción', 'Stock', 'Precio Público']],
                body: tableData,
                startY: startY,
                styles: { fontSize: 9 },
                headStyles: { fillColor: [46, 125, 50] },
                margin: { left: 14 }
            });

            startY = (doc as any).lastAutoTable.finalY + 10;

            // Verificar si necesitamos nueva página
            if (startY > 250) {
                doc.addPage();
                startY = 20;
            }
        }
    } else {
        // Agrupar por rubro
        const groupedByRubro = products.reduce((acc, product) => {
            const rubroId = product.tipoProductoId;
            if (!acc[rubroId]) {
                acc[rubroId] = [];
            }
            acc[rubroId].push(product);
            return acc;
        }, {} as Record<number, Producto[]>);

        // Generar tabla por cada rubro
        for (const [rubroId, productsGroup] of Object.entries(groupedByRubro)) {
            const rubroNombre = tipoMap.get(Number(rubroId)) ?? 'Rubro Desconocido';

            doc.setFontSize(14);
            doc.setTextColor(46, 125, 50);
            doc.text(`Rubro: ${rubroNombre}`, 14, startY);
            startY += 7;

            const tableData = productsGroup.map(p => [
                p.codigoProducto,
                p.descripcion,
                String(p.cantidad ?? 0),
                formatCurrency(p.precio_publico ?? 0)
            ]);

            autoTable(doc, {
                head: [['Código', 'Descripción', 'Stock', 'Precio Público']],
                body: tableData,
                startY: startY,
                styles: { fontSize: 9 },
                headStyles: { fillColor: [46, 125, 50] },
                margin: { left: 14 }
            });

            startY = (doc as any).lastAutoTable.finalY + 10;

            // Verificar si necesitamos nueva página
            if (startY > 250) {
                doc.addPage();
                startY = 20;
            }
        }
    }

    doc.save(`${type}_${categoryName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};
