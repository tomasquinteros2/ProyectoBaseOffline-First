import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useIsMutating, useMutation, useQueryClient, onlineManager } from '@tanstack/react-query';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    Container, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, CircularProgress, Alert, Box, Button,
    Tooltip, IconButton, Menu, MenuItem, Dialog, DialogActions,
    DialogContent, DialogContentText, DialogTitle, TextField, List, ListItem,
    ListItemText, Grid, FormControl, InputLabel, Select, Divider,
    Checkbox, Pagination,TableSortLabel,InputAdornment
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import InfoIcon from '@mui/icons-material/Info';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { AddCircle } from "@mui/icons-material";
import { useDebounce } from 'use-debounce';

import { fetchProveedoresDetallados, fetchProveedoresLastModified} from '../api/proveedoresApi';
import {fetchDolar} from "../api/dolarApi.ts";
import {
    fetchProducts,
    fetchProveedores,
    fetchTiposProducto,
    updateProduct,
    deleteProduct,
    fetchRelatedProducts,
    fetchProductsLastModified,
    deleteMultipleProducts,
    fetchTipoProductoLastModified,
    type ProductPayload
} from '../api/productsApi';
import type { Producto, RelatedProductResult, Page } from '../types/Producto';
import { useCart } from '../context/CartProvider';
import { useAuth } from '../hooks/useAuth';
import BulkUploadDialog from '../components/BulkUploadDialog';
import { useSearchParams } from 'react-router-dom';

type Order = 'asc' | 'desc';

interface DeleteMutationContext {
    previousProductsPage?: Page<Producto>;
}
function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    const av = a[orderBy] as unknown as string | number | null | undefined;
    const bv = b[orderBy] as unknown as string | number | null | undefined;
    if (bv === undefined || bv === null) return -1;
    if (av === undefined || av === null) return 1;
    if (typeof bv === 'number' && typeof av === 'number') return bv - av;
    return String(bv).localeCompare(String(av), undefined, { numeric: true, sensitivity: 'base' });
}
function getComparator<Key extends keyof any>(
    order: Order,
    orderBy: Key
): (a: { [key in Key]: unknown }, b: { [key in Key]: unknown }) => number {
    return order === 'desc'
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}
function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number) {
    const stabilized = array.map((el, index) => [el, index] as [T, number]);
    stabilized.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        return order !== 0 ? order : a[1] - b[1];
    });
    return stabilized.map((el) => el[0]);
}

export const exportProductsToExcel = async (): Promise<Blob> => {
    const XLSX = await import('xlsx');
    const allProducts: Producto[] = [];
    let currentPage = 0;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
        const pageData = await fetchProducts(currentPage, pageSize, '', '', '');
        allProducts.push(...pageData.content);
        hasMore = pageData.content.length === pageSize;
        currentPage++;
    }

    const tiposProducto = await fetchTiposProducto();
    const proveedores = await fetchProveedores();
    const tipoMap = new Map(tiposProducto.map(t => [t.id, t.nombre]));
    const proveedorMap = new Map(proveedores.map(p => [p.id, p.nombre]));

    const groupedProducts = allProducts.reduce((acc, product) => {
        const tipoId = product.tipoProductoId;
        if (!acc[tipoId]) {
            acc[tipoId] = [];
        }
        acc[tipoId].push(product);
        return acc;
    }, {} as Record<number, Producto[]>);

    const excelData: Record<string, string | number>[] = [];

    for (const tipoId in groupedProducts) {
        const tipoNombre = tipoMap.get(Number(tipoId)) ?? 'Sin Tipo';

        // Fila de encabezado del tipo/rubro
        excelData.push({
            CODIGO: '',
            DESCRIPCION: tipoNombre,
            PROVEEDOR: '',
            'PUBLICO': '',
            'S/RED': '',
            'RESTO': '',
            'US': '',
            '%GAN': '',
            'COSTO US': '',
            IVA: '',
            'US S/IVA': '',
            CANTIDAD: '',
            'FECHA ING': ''
        });

        groupedProducts[Number(tipoId)].forEach(product => {
            excelData.push({
                CODIGO: product.codigoProducto,
                DESCRIPCION: product.descripcion,
                PROVEEDOR: proveedorMap.get(product.proveedorId) ?? 'Sin Proveedor',
                'PUBLICO': product.precio_publico,
                'S/RED': product.precio_sin_redondear,
                'RESTO': product.resto,
                'US': product.precio_publico_us,
                '%GAN': product.porcentaje_ganancia,
                'COSTO US': product.costo_dolares,
                IVA: product.iva + 1,
                'US S/IVA': product.precio_sin_iva,
                CANTIDAD: product.cantidad,
                'FECHA ING': product.fecha_ingreso
            });
        });
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as Uint8Array;
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const downloadExcelFile = async (filename = 'productos.xlsx'): Promise<void> => {
    try {
        toast.loading('Generando archivo Excel...', { id: 'excel-export' });
        const blob = await exportProductsToExcel();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Archivo Excel generado correctamente', { id: 'excel-export' });
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        toast.error('Error al generar el archivo Excel', { id: 'excel-export' });
    }
};

function ProductListPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { addToCart } = useCart();
    const { role } = useAuth();
    const isAdmin = role === 'ADMIN';
    const canViewAllData = role === 'ADMIN' || role === 'VIEWER';
    const isViewer = role === 'VIEWER';

    const [editingCell, setEditingCell] = useState<{ id: number | string; field: 'porcentaje_ganancia' | 'precio_sin_iva' } | null>(null);
    const [editValue, setEditValue] = useState('');

    const [searchParams, setSearchParams] = useSearchParams();

    const searchInputRef = useRef<HTMLInputElement>(null);

    const [order, setOrder] = useState<Order>('asc');
    const [orderBy, setOrderBy] = useState<keyof Producto>('id');

    const page = parseInt(searchParams.get('page') ?? '0', 10);
    const [rowsPerPage] = useState(20);
    const searchInput = searchParams.get('search') ?? '';
    const proveedorFilter = searchParams.get('proveedor') ?? '';
    const tipoFilter = searchParams.get('tipo') ?? '';
    const [debouncedSearch] = useDebounce(searchInput, 500);

    const [allProducts, setAllProducts] = useState<Producto[]>([]);
    const [selectedProducts, setSelectedProducts] = useState(new Set<number | string>());
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const { data: tiposProducto } = useQuery({ queryKey: ['tiposProducto'], queryFn: fetchTiposProducto });

    const updateFieldMutation = useMutation<Producto, Error, { id: string; field: string; value: number }>({
        mutationFn: async ({ id, field, value }) => {
            const product = products.find(p => p.id.toString() === id.toString());
            if (!product) throw new Error('Producto no encontrado');

            const payload: ProductPayload = {
                codigoProducto: product.codigoProducto,
                descripcion: product.descripcion,
                cantidad: product.cantidad,
                proveedorId: product.proveedorId,
                tipoProductoId: product.tipoProductoId,
                porcentaje_ganancia: field === 'porcentaje_ganancia' ? value : product.porcentaje_ganancia,
                iva: product.iva,
                resto: product.resto,
                costoFijo: product.costoFijo,
                costo_pesos: product.costo_pesos,
                precio_sin_iva: field === 'precio_sin_iva' ? value : product.precio_sin_iva,
            };

            return updateProduct({ id: id.toString(), payload });
        },
        onSuccess: () => {
            toast.success('Campo actualizado exitosamente');
            void queryClient.invalidateQueries({ queryKey: ['products'] });
            setEditingCell(null);
        },
        onError: () => {
            toast.error('Error al actualizar el campo');
            setEditingCell(null);
        },
    });

    const handleCellDoubleClick = (
        e: React.MouseEvent,
        productId: number | string,
        field: 'porcentaje_ganancia' | 'precio_sin_iva',
        currentValue: number
    ) => {
        if (!isAdmin) return;
        e.stopPropagation();
        setEditingCell({ id: productId, field });
        setEditValue(currentValue.toString());
    };

    const handleCellBlur = () => {
        if (!editingCell) return;

        const newValue = parseFloat(editValue);
        if (isNaN(newValue) || newValue < 0) {
            toast.error('Valor inválido');
            setEditingCell(null);
            return;
        }

        updateFieldMutation.mutate({
            id: editingCell.id.toString(),
            field: editingCell.field,
            value: newValue,
        });
    };

    const handleCellKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCellBlur();
        } else if (e.key === 'Escape') {
            setEditingCell(null);
        }
    };
    const [localSearch, setLocalSearch] = useState(searchInput);
    useEffect(() => {
        setLocalSearch(searchInput);
    }, [searchInput]);
    const { data: pageData, error, isLoading, isFetching } = useQuery<Page<Producto>, Error>({
        queryKey: ['products', page, rowsPerPage, localSearch, proveedorFilter || '', tipoFilter || '', orderBy, order],
        queryFn: () => fetchProducts(
            page,
            rowsPerPage,
            localSearch,
            proveedorFilter || '',
            tipoFilter || '',
            orderBy as string,
            order
        ),
        staleTime: 0,
        gcTime: onlineManager.isOnline() ? 0 : 1000 * 60 * 60,
        enabled: true,
        placeholderData: (previousData) => previousData, // <-- Esto mantiene los datos anteriores mientras carga los nuevos
    });
    const updateSearchParams = (updates: Record<string, string | number>) => {
        const newParams = new URLSearchParams(searchParams);

        Object.entries(updates).forEach(([key, value]) => {
            if (value === '' || value === 0) {
                newParams.delete(key)
            } else {
                newParams.set(key, String(value));
            }
        });

        setSearchParams(newParams);
    };

    const products = pageData?.content ?? [];

    const { data: dolarData } = useQuery({ queryKey: ['dolar'], queryFn: fetchDolar });
    const { data: proveedores } = useQuery({
        queryKey: ['proveedores'],
        queryFn: fetchProveedoresDetallados,
        staleTime: 0,
    });
    const proveedorOptions = (proveedores ?? []).slice().sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
    );

    const proveedorMap = useMemo(() => {
        if (!proveedores) return new Map<number, string>();
        return new Map(proveedores.map(p => [p.id, p.nombre]));
    }, [proveedores]);

    const tipoProductoMap = useMemo(() => {
        if (!tiposProducto) return new Map<number, string>();
        return new Map(tiposProducto.map(t => [t.id, t.nombre]));
    }, [tiposProducto]);

    const pendingMutations = useIsMutating({ mutationKey: ['createProduct'] }) +
        useIsMutating({ mutationKey: ['updateProduct'] }) +
        useIsMutating({ mutationKey: ['deleteProduct'] }) +
        useIsMutating({ mutationKey: ['registrarVenta'] });

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedProductId, setSelectedProductId] = useState<null | number | string>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedProductForDetails, setSelectedProductForDetails] = useState<Producto | null>(null);
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

    const {
        data: relatedProductsForDetail,
        isLoading: isLoadingRelatedForDetail,
        isError: isErrorRelatedForDetail,
    } = useQuery<RelatedProductResult[]>({
        queryKey: ['relatedProducts', selectedProductForDetails?.id],
        queryFn: () => fetchRelatedProducts(selectedProductForDetails!.id),
        enabled: isDetailsOpen && !!selectedProductForDetails?.id,
    });

    const handleProveedorChange = (value: string) => {
        updateSearchParams({ proveedor: value, page: 0 });
    };

    const handleTipoChange = (value: string) => {
        updateSearchParams({ tipo: value, page: 0 });
    };

    const handlePageChange = (_event: React.ChangeEvent<unknown>, newPage: number) => {
        updateSearchParams({ page: newPage - 1 });
    };


    const handleClearFilters = () => {
        setSearchParams(new URLSearchParams());
    };
    const handleRequestSort = (property: keyof Producto) => () => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        updateSearchParams({ page: 0 });
    };
    const sortedProducts = useMemo(
        () => stableSort(products, getComparator(order, orderBy)),
        [products, order, orderBy]
    );
    const handleExportToExcel = async () => {
        try {
            await downloadExcelFile(`productos_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            toast.error('Error al exportar a Excel');
        }
    };
    const getFilteredProducts = useMemo(() => {
        let filtered = allProducts;
        if (searchInput) {
            const searchLower = searchInput.toLowerCase();
            filtered = filtered.filter(p =>
                p.codigoProducto?.toLowerCase().includes(searchLower) ||
                p.descripcion?.toLowerCase().includes(searchLower)
            );
        }

        if (proveedorFilter) {
            filtered = filtered.filter(p => String(p.proveedorId) === proveedorFilter);
        }
        if (tipoFilter) {
            filtered = filtered.filter(p => String(p.tipoProductoId) === tipoFilter);
        }

        return filtered;
    }, [allProducts, searchInput, proveedorFilter, tipoFilter]);

    const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            // Selecciona todos los productos de la página actual
            setSelectedProducts(new Set(products.map(p => p.id)));
        } else {
            setSelectedProducts(new Set());
        }
    };

    const handleSelectOne = (productId: number | string) => {
        setSelectedProducts(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(productId)) {
                newSelected.delete(productId);
            } else {
                newSelected.add(productId);
            }
            return newSelected;
        });
    };
    const bulkDeleteMutation = useMutation<void, Error, (number | string)[], { previous: Array<{ key: unknown; data: Page<Producto> | undefined }> }>({
        mutationFn: async (ids) => {
            return deleteMultipleProducts(ids);
        },
        onMutate: async (ids) => {
            const idsSet = new Set(ids);
            const baseKey = ['products'];
            await queryClient.cancelQueries({ queryKey: baseKey });
            const allQueries = queryClient.getQueriesData<Page<Producto>>({ queryKey: baseKey });

            const previous = allQueries.map(([key, data]) => ({ key, data }));

            allQueries.forEach(([key, data]) => {
                if (!data?.content) return;
                queryClient.setQueryData<Page<Producto>>(key, {
                    ...data,
                    content: data.content.filter(p => !idsSet.has(p.id)),
                    totalElements: data.totalElements - ids.length,
                });
            });
            setAllProducts(prev => prev.filter(p => !idsSet.has(p.id)));

            setSelectedProducts(new Set());

            toast.loading('Eliminando productos seleccionados...', { id: 'bulk-del' });
            return { previous };
        },
        onError: (_err, _ids, context) => {
            console.log('onError - Error:', _err);
            if (context?.previous) {
                context.previous.forEach(({ key, data }) => {
                    if (data) {
                        queryClient.setQueryData(key, data);
                    }
                });
            }
            toast.error('Error eliminando productos', { id: 'bulk-del' });
        },
        onSuccess: () => {
            toast.success('Productos eliminados', { id: 'bulk-del' });
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
    const handleDeleteList = async () => {
        if (selectedProducts.size === 0 || bulkDeleteMutation.isPending) return;
        const confirmar = window.confirm(`¿Eliminar ${selectedProducts.size} producto(s)? Esta acción es irreversible.`);
        if (!confirmar) return;
        const ids = Array.from(selectedProducts);
        console.log('IDs a eliminar:', ids);
        console.log('Cantidad de productos:', ids.length);
        bulkDeleteMutation.mutate(ids);
    };
    const handleProductClick = (product: Producto) => {
        if (canViewAllData) {
            setSelectedProductForDetails(product);
            setIsDetailsOpen(true);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatUSD = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    };


    const formatIVA = (iva: number) => {
        const percent = iva > 1 ? iva : iva * 100;
        const maximumFractionDigits = percent % 1 === 0 ? 0 : 1;
        return new Intl.NumberFormat('es-AR', { maximumFractionDigits }).format(percent) + '%';
    };

    const tiposFiltradosQuery = useQuery({
        queryKey: ['tiposProductoByProveedor', proveedorFilter],
        queryFn: async () => {
            // Si no hay filtro de proveedor, devolvemos todos los tipos ya cargados
            if (!proveedorFilter) return tiposProducto ?? [];

            // Paginado para recopilar todos los productos del proveedor y extraer los tipoIds
            const tipoIds = new Set<number>();
            let currentPage = 0;
            const pageSize = 100;
            let hasMore = true;

            while (hasMore) {
                const pageData = await fetchProducts(currentPage, pageSize, '', proveedorFilter, '');
                pageData.content.forEach(p => {
                    if (p.tipoProductoId != null) tipoIds.add(p.tipoProductoId);
                });
                hasMore = pageData.content.length === pageSize;
                currentPage++;
            }

            return (tiposProducto ?? []).filter(t => tipoIds.has(t.id));
        },
        enabled: !!tiposProducto, // esperar a que tiposProducto esté disponible
        staleTime: 1000 * 60 * 5,
    });

    const tipoOptions = (
        proveedorFilter
            ? (tiposFiltradosQuery.data ?? [])
            : (tiposProducto ?? [])
    ).slice().sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
    );

    const handleGenerateCustomPdf = async () => {
        const selectedIds = Array.from(selectedProducts).map(id => String(id));

        // Buscar en memoria (allProducts y products (pageData.content) si existe)
        let foundProducts = selectedIds
            .map(id => (allProducts.find(p => String(p.id) === id) ?? products.find(p => String(p.id) === id)))
            .filter(Boolean) as Producto[];

        // Si faltan productos, cargar todos los productos paginados (misma estrategia que exportProductsToExcel)
        if (foundProducts.length < selectedIds.length) {
            try {
                const allFetched: Producto[] = [];
                let currentPage = 0;
                const pageSize = 100;
                let hasMore = true;

                while (hasMore) {
                    const pageData = await fetchProducts(currentPage, pageSize, '', '', '');
                    allFetched.push(...pageData.content);
                    hasMore = pageData.content.length === pageSize;
                    currentPage++;
                }

                foundProducts = selectedIds
                    .map(id => allFetched.find(p => String(p.id) === id))
                    .filter(Boolean) as Producto[];
            } catch (err) {
                console.error('Error cargando productos completos:', err);
                toast.error('No se pudieron cargar todos los productos seleccionados.');
                return;
            }
        }

        if (foundProducts.length === 0) {
            toast.error('No hay productos seleccionados para generar la lista.');
            return;
        }

        setIsGeneratingPdf(true);
        try {
            toast.loading('Generando PDF personalizado...', { id: 'custom-pdf-toast' });

            const doc = new jsPDF();
            doc.setFontSize(20);
            doc.text('Lista de Productos Seleccionados', 14, 22);
            doc.setFontSize(12);
            doc.text(`Generado el: ${new Date().toLocaleDateString('es-AR')}`, 14, 32);

            const tableData = foundProducts.map(p => [
                p.id,
                p.codigoProducto,
                p.descripcion,
                String(p.cantidad ?? ''),
                formatCurrency(p.precio_publico ?? 0)
            ]);

            autoTable(doc, {
                head: [['id', 'Código', 'Descripción', 'Cantidad', 'Precio Público']],
                body: tableData,
                startY: 40,
                styles: { fontSize: 10 },
                headStyles: { fillColor: [46, 125, 50] }
            });

            doc.save(`productos_seleccionados_${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success('PDF generado correctamente', { id: 'custom-pdf-toast' });
        } catch (error) {
            console.error('Error generando PDF:', error);
            toast.error('Error al generar el PDF', { id: 'custom-pdf-toast' });
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleSearchEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            void queryClient.invalidateQueries({ queryKey: ['products'] });
        }
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, productId: number | string) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
        setSelectedProductId(productId);
    };

    const handleMenuClose = () => setAnchorEl(null);

    const deleteMutation = useMutation<void, Error, number | string, DeleteMutationContext>({
        mutationFn: deleteProduct,
        onMutate: async (productIdToDelete) => {
            const queryKey = ['products', page, rowsPerPage, searchInput, proveedorFilter, tipoFilter];
            await queryClient.cancelQueries({ queryKey });
            const previousProductsPage = queryClient.getQueryData<Page<Producto>>(queryKey);

            queryClient.setQueryData<Page<Producto>>(queryKey, (oldPage) => {
                if (!oldPage) return oldPage;
                return {
                    ...oldPage,
                    content: oldPage.content.filter(p => p.id !== productIdToDelete),
                };
            });

            return { previousProductsPage };
        },
        onSuccess: () => toast.success('Producto eliminado con éxito'),
        onError: (_err, _productIdToDelete, context) => {
            const queryKey = ['products', page, rowsPerPage, searchInput, proveedorFilter, tipoFilter];
            if (context?.previousProductsPage) {
                queryClient.setQueryData(queryKey, context.previousProductsPage);
            }
            if (onlineManager.isOnline()) {
                void queryClient.invalidateQueries({ queryKey: ['products'] });
            }
            toast.error('Error al eliminar el producto');
        },
        onSettled: () => {
            if (onlineManager.isOnline()) {
                void queryClient.invalidateQueries({ queryKey: ['products'] });
            }
        },
    });

    const handleDeleteClick = () => {
        handleMenuClose();
        setIsConfirmOpen(true);
    };

    const handleConfirmClose = () => {
        setIsConfirmOpen(false);
        setSelectedProductId(null);
    };

    const handleConfirmDelete = () => {
        if (selectedProductId) {
            deleteMutation.mutate(selectedProductId);
        }
        handleConfirmClose();
    };
    useEffect(() => {
        const savedState = sessionStorage.getItem('productListState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);

                // Restaurar los parámetros en la URL
                updateSearchParams({
                    page: state.page || 0,
                    search: state.searchInput || '',
                    proveedor: state.proveedorFilter || '',
                    tipo: state.tipoFilter || ''
                });

                // Restaurar el estado local del input
                setLocalSearch(state.searchInput || '');
                setOrder(state.order || 'asc');
                setOrderBy(state.orderBy || 'id');

                // Limpiar el sessionStorage después de restaurar
                sessionStorage.removeItem('productListState');
            } catch (error) {
                console.error('Error al restaurar el estado:', error);
            }
        }
    }, []);
    const handleEdit = () => {
        if (selectedProductId) {
            // Guardar estado actual en sessionStorage
            sessionStorage.setItem('productListState', JSON.stringify({
                page,
                searchInput: localSearch, // <-- Usar localSearch en lugar de searchInput
                proveedorFilter,
                tipoFilter,
                orderBy,
                order
            }));

            navigate(`/productos/editar/${selectedProductId}`);
        }
        handleMenuClose();
    };

    const handleDetailsClick = () => {
        if (selectedProductId) {
            const product = products.find((p: Producto) => p.id === selectedProductId);
            if (product) {
                setSelectedProductForDetails(product);
                setIsDetailsOpen(true);
            }
        }
        handleMenuClose();
    };

    const handleDetailsClose = () => {
        setIsDetailsOpen(false);
        setSelectedProductForDetails(null);
    };

    const handleBulkUploadClose = (uploaded: boolean) => {
        setIsBulkUploadOpen(false);
        if (uploaded) {
            void queryClient.invalidateQueries({ queryKey: ['products'] });
        }
    };
    const lastKnownProductsTimestamp = useRef<number>(0);
    const lastKnownProveedoresTimestamp = useRef<number>(0);
    const lastKnownTiposProductoTimestamp = useRef<number>(0);

    const { data: tiposProductoLastModifiedData } = useQuery({
        queryKey: ['tiposProductoLastModified'],
        queryFn: fetchTipoProductoLastModified,
        refetchInterval: 5000,
        staleTime: 0,
        enabled: onlineManager.isOnline(),
    });

// Query que verifica cambios en productos cada 5 segundos
    const { data: productsLastModifiedData } = useQuery({
        queryKey: ['productsLastModified'],
        queryFn: fetchProductsLastModified,
        refetchInterval: 5000,
        staleTime: 0,
        enabled: onlineManager.isOnline(),
    });

// Query que verifica cambios en proveedores cada 5 segundos
    const { data: proveedoresLastModifiedData } = useQuery({
        queryKey: ['proveedoresLastModified'],
        queryFn: fetchProveedoresLastModified,
        refetchInterval: 5000,
        staleTime: 0,
        enabled: onlineManager.isOnline(),
    });

    useEffect(() => {
        if (!tiposProductoLastModifiedData) return;

        if (lastKnownTiposProductoTimestamp.current === 0) {
            // Primera vez: solo guardar el timestamp sin invalidar
            lastKnownTiposProductoTimestamp.current = tiposProductoLastModifiedData.lastModified;
            return;
        }

        if (tiposProductoLastModifiedData.lastModified > lastKnownTiposProductoTimestamp.current) {
            console.log('Cambios en rubros (tiposProducto) detectados, actualizando...');
            lastKnownTiposProductoTimestamp.current = tiposProductoLastModifiedData.lastModified;
            void queryClient.invalidateQueries({ queryKey: ['tiposProducto'] });

            //el combo filtrado por proveedor se recalcula también:
            void queryClient.invalidateQueries({ queryKey: ['tiposProductoByProveedor'] });
        }
    }, [tiposProductoLastModifiedData, queryClient]);
// Efecto que invalida productos cuando detecta cambios
    useEffect(() => {
        if (!productsLastModifiedData) return;

        if (lastKnownProductsTimestamp.current === 0) {
            // Primera vez: solo guardar el timestamp sin invalidar
            lastKnownProductsTimestamp.current = productsLastModifiedData.lastModified;
            return;
        }

        if (productsLastModifiedData.lastModified > lastKnownProductsTimestamp.current) {
            console.log('Cambios en productos detectados, actualizando...');
            lastKnownProductsTimestamp.current = productsLastModifiedData.lastModified;
            void queryClient.invalidateQueries({ queryKey: ['products'] });
        }
    }, [productsLastModifiedData, queryClient]);

// Efecto que invalida proveedores cuando detecta cambios
    useEffect(() => {
        if (!proveedoresLastModifiedData) return;

        if (lastKnownProveedoresTimestamp.current === 0) {
            // Primera vez: solo guardar el timestamp sin invalidar
            lastKnownProveedoresTimestamp.current = proveedoresLastModifiedData.lastModified;
            return;
        }

        if (proveedoresLastModifiedData.lastModified > lastKnownProveedoresTimestamp.current) {
            console.log('Cambios en proveedores detectados, actualizando...');
            lastKnownProveedoresTimestamp.current = proveedoresLastModifiedData.lastModified;
            void queryClient.invalidateQueries({ queryKey: ['proveedores'] });
        }
    }, [proveedoresLastModifiedData, queryClient]);

    if (isLoading) {
        return <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh"><CircularProgress /></Box>;
    }

    if (error) {
        return <Container sx={{ mt: 4 }}><Alert severity="error">Error al cargar los productos: {error.message}</Alert></Container>;
    }


    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Gestión de Productos
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {isAdmin && (
                        <>
                            <Button
                                variant="outlined"
                                startIcon={<AddCircle />}
                                component={RouterLink}
                                to="/productos/nuevo"
                            >
                                Nuevo Producto
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<CloudUploadIcon />}
                                onClick={() => setIsBulkUploadOpen(true)}
                            >
                                Cargar Archivo
                            </Button>
                        </>
                    )}
                    {canViewAllData && (
                        <Button
                            variant="outlined"
                            startIcon={<FileDownloadIcon />}
                            onClick={handleExportToExcel}
                        >
                            Exportar Excel
                        </Button>
                    )}
                </Box>
            </Box>

            <Paper sx={{ p: 2, mb: 2, position: 'relative' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            inputRef={searchInputRef}
                            label="Buscar"
                            variant="outlined"
                            value={localSearch} // <-- Estado local
                            onChange={(e) => setLocalSearch(e.target.value)}
                            disabled={isLoading}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                                endAdornment: localSearch && (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setLocalSearch('')} edge="end">
                                            <ClearIcon />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            onKeyDown={handleSearchEnter}
                        />
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth>
                            <InputLabel>Proveedor</InputLabel>
                            <Select
                                value={proveedorFilter}
                                label="Proveedor"
                                onChange={(e) => handleProveedorChange(e.target.value)}
                            >
                                <MenuItem value="">Todos</MenuItem>
                                {proveedorOptions?.map((p) => (
                                    <MenuItem key={p.id} value={String(p.id)}>
                                        {p.nombre}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth>
                            <InputLabel id="tipo-label">Rubro</InputLabel>
                            <Select
                                labelId="tipo-label"
                                value={tipoFilter}
                                label="Rubro"
                                onChange={(e) => handleTipoChange(e.target.value as string)}
                                disabled={tiposFiltradosQuery.isFetching}
                            >
                                <MenuItem value="">Todos</MenuItem>
                                {tipoOptions.map(t => (
                                    <MenuItem key={t.id} value={String(t.id)}>{t.nombre}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <Typography variant="body2" color="text.secondary">
                            {pageData?.totalElements ?? 0} productos
                        </Typography>
                    </Grid>
                    {proveedorFilter && isAdmin && proveedores && (
                        <Grid item xs={12} md={2}>
                            <Typography variant="body2" color="text.secondary">
                                Dólar: ${(() => {
                                const proveedor = proveedores.find(p => p.id === Number(proveedorFilter));
                                if (!proveedor) return 'N/A';

                                if (proveedor.tipoCotizacion === 'MANUAL') {
                                    return Number(proveedor.valorCotizacionManual).toFixed(2);
                                }
                                return dolarData?.[0]?.precio?.toFixed(2) ?? 'N/A';
                            })()}
                            </Typography>
                        </Grid>
                    )}
                </Grid>
                {(isFetching && !isLoading) && (
                    <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                        <CircularProgress size={20} />
                    </Box>
                )}
            </Paper>

            {pendingMutations > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Hay {pendingMutations} operación(es) en progreso...
                </Alert>
            )}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            {canViewAllData && (
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        indeterminate={
                                            selectedProducts.size > 0 &&
                                            products.length > 0 &&
                                            selectedProducts.size < products.length
                                        }
                                        checked={
                                            products.length > 0 &&
                                            products.every(p => selectedProducts.has(p.id))
                                        }
                                        onChange={handleSelectAll}
                                    />
                                </TableCell>
                            )}
                            <TableCell>ID</TableCell>
                            <TableCell sortDirection={orderBy === 'codigoProducto' ? order : false}>
                                <TableSortLabel
                                    active={orderBy === 'codigoProducto'}
                                    direction={orderBy === 'codigoProducto' ? order : 'asc'}
                                    onClick={handleRequestSort('codigoProducto')}
                                >
                                    Código
                                </TableSortLabel>
                            </TableCell>
                            {canViewAllData &&
                                <TableCell sortDirection={orderBy === 'descripcion' ? order : false}>
                                    <TableSortLabel
                                        active={orderBy === 'descripcion'}
                                        direction={orderBy === 'descripcion' ? order : 'asc'}
                                        onClick={handleRequestSort('descripcion')}
                                    >
                                        Descripción
                                    </TableSortLabel>
                                </TableCell>}
                            {canViewAllData && <TableCell>Proveedor</TableCell>}
                            {canViewAllData && <TableCell>Rubro</TableCell>}
                            {canViewAllData && <TableCell align="left" sortDirection={orderBy === 'cantidad' ? order : false}>
                                <TableSortLabel
                                    active={orderBy === 'cantidad'}
                                    direction={orderBy === 'cantidad' ? order : 'asc'}
                                    onClick={handleRequestSort('cantidad')}
                                >
                                    Stock
                                </TableSortLabel>
                            </TableCell>}
                            {canViewAllData && <TableCell align="right">
                                <Tooltip title={isAdmin ? "Doble clic para editar" : ""}>
                                    <span>US S/IVA</span>
                                </Tooltip>
                            </TableCell>}
                            {canViewAllData && <TableCell>IVA</TableCell>}
                            {canViewAllData && <TableCell>US C/IVA</TableCell>}
                            {canViewAllData && <TableCell align="right">
                                <Tooltip title={isAdmin ? "Doble clic para editar" : ""}>
                                    <span>% Ganancia</span>
                                </Tooltip>
                            </TableCell>}
                            {!canViewAllData && <TableCell>Proveedor</TableCell>}
                            {!canViewAllData && <TableCell>Rubro</TableCell>}
                            {!canViewAllData && <TableCell sortDirection={orderBy === 'descripcion' ? order : false}>
                                <TableSortLabel
                                    active={orderBy === 'descripcion'}
                                    direction={orderBy === 'descripcion' ? order : 'asc'}
                                    onClick={handleRequestSort('descripcion')}
                                >
                                    Descripción
                                </TableSortLabel>
                            </TableCell>}
                            {!canViewAllData && <TableCell align="left" >Stock</TableCell>}
                            <TableCell align="right">Precio Público</TableCell>
                            <TableCell align="center">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedProducts.map((product) => (
                            <TableRow
                                key={product.id}
                                hover
                                selected={selectedProducts.has(product.id)}
                                sx={{
                                    cursor: canViewAllData ? 'pointer' : 'default',
                                    backgroundColor: product.costoFijo ? 'rgba(255, 193, 7, 0.1)' : 'inherit', // Fondo amarillo claro
                                    '&:hover': {
                                        backgroundColor: product.costoFijo ? 'rgba(255, 193, 7, 0.2)' : undefined,
                                    },
                                }}
                                onClick={() => canViewAllData && handleProductClick(product)}
                            >
                                {canViewAllData && (
                                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={selectedProducts.has(product.id)}
                                            onChange={() => handleSelectOne(product.id)}
                                        />
                                    </TableCell>
                                )}
                                <TableCell>
                                    <Typography variant="body2" fontWeight="medium">
                                        {product.id}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2" fontWeight="medium">
                                            {product.codigoProducto}
                                        </Typography>
                                        {product.costoFijo && (
                                            <Tooltip title="Costo Fijo">
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        backgroundColor: 'warning.main',
                                                        color: 'white',
                                                        borderRadius: '12px',
                                                        px: 1,
                                                        py: 0.25,
                                                        fontSize: '0.7rem',
                                                        fontWeight: 'bold',
                                                    }}
                                                >
                                                    FIJO
                                                </Box>
                                            </Tooltip>
                                        )}
                                    </Box>
                                </TableCell>
                                {canViewAllData &&(
                                    <TableCell>
                                        <Typography variant="body2">
                                            {product.descripcion}
                                        </Typography>
                                    </TableCell>
                                )}
                                {canViewAllData && (
                                    <TableCell>
                                        <Typography variant="body2">
                                            {proveedorMap.get(product.proveedorId) ?? 'N/A'}
                                        </Typography>
                                    </TableCell>
                                )}
                                {canViewAllData && (
                                    <TableCell>
                                        <Typography variant="body2">
                                            {tipoProductoMap.get(product.tipoProductoId) ?? 'N/A'}
                                        </Typography>
                                    </TableCell>
                                )}
                                {canViewAllData && (
                                    <TableCell>
                                        <Typography variant="body2">
                                            {product.cantidad}
                                        </Typography>
                                    </TableCell>
                                )}
                                {canViewAllData && (
                                    <TableCell align="right">
                                        {isAdmin && editingCell?.id === product.id && editingCell.field === 'precio_sin_iva' ? (
                                            <TextField
                                                autoFocus
                                                size="small"
                                                type="number"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={handleCellBlur}
                                                onKeyDown={handleCellKeyDown}
                                                onClick={(e) => e.stopPropagation()}
                                                sx={{ width: '120px' }}
                                            />
                                        ) : (
                                            <Box
                                                sx={{
                                                    position: 'relative',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 0.5,
                                                    '&:hover .edit-icon': {
                                                        opacity: isAdmin ? 1 : 0,
                                                    },
                                                }}
                                            >
                                                {product.costoFijo ? (
                                                    <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                                                        N/A
                                                    </Typography>
                                                ) : (
                                                    <Typography variant="body2">{formatUSD(product.precio_sin_iva)}</Typography>)}
                                                {isAdmin && (
                                                    <IconButton
                                                        size="small"
                                                        className="edit-icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCellDoubleClick(e, product.id, 'precio_sin_iva', product.precio_sin_iva);
                                                        }}
                                                        sx={{
                                                            opacity: 0,
                                                            transition: 'opacity 0.2s',
                                                            padding: '2px',
                                                        }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </Box>
                                        )}
                                    </TableCell>
                                )}
                                {canViewAllData && (
                                    <TableCell>
                                        <Typography variant="body2">
                                            {formatIVA(product.iva)}
                                        </Typography>
                                    </TableCell>
                                )}
                                {canViewAllData && (
                                    <TableCell>
                                        {product.costoFijo ? (
                                            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                                                N/A
                                            </Typography>
                                        ) : (
                                            <Typography variant="body2">
                                                {formatUSD(product.costo_dolares || 0)}
                                            </Typography>
                                        )}
                                    </TableCell>
                                )}
                                {canViewAllData && (
                                    <TableCell align="right">
                                        {isAdmin && editingCell?.id === product.id && editingCell.field === 'porcentaje_ganancia' ? (
                                            <TextField
                                                autoFocus
                                                size="small"
                                                type="number"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={handleCellBlur}
                                                onKeyDown={handleCellKeyDown}
                                                onClick={(e) => e.stopPropagation()}
                                                sx={{ width: '100px' }}
                                            />
                                        ) : (
                                            <Box
                                                sx={{
                                                    position: 'relative',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 0.5,
                                                    '&:hover .edit-icon': {
                                                        opacity: isAdmin ? 1 : 0,
                                                    },
                                                }}
                                            >
                                                <Typography variant="body2">{product.porcentaje_ganancia}%</Typography>
                                                {isAdmin && (
                                                    <IconButton
                                                        size="small"
                                                        className="edit-icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCellDoubleClick(e, product.id, 'porcentaje_ganancia', product.porcentaje_ganancia);
                                                        }}
                                                        sx={{
                                                            opacity: 0,
                                                            transition: 'opacity 0.2s',
                                                            padding: '2px',
                                                        }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </Box>
                                        )}
                                    </TableCell>
                                )}
                                {!canViewAllData && (
                                    <TableCell>
                                        <Typography variant="body2">
                                            {proveedorMap.get(product.proveedorId) ?? 'N/A'}
                                        </Typography>
                                    </TableCell>
                                )}
                                {!canViewAllData && (
                                    <TableCell>
                                        <Typography variant="body2">
                                            {tipoProductoMap.get(product.tipoProductoId) ?? 'N/A'}
                                        </Typography>
                                    </TableCell>
                                )}
                                {!canViewAllData &&(
                                    <TableCell>
                                        <Typography variant="body2">
                                            {product.descripcion}
                                        </Typography>
                                    </TableCell>
                                )}
                                {!canViewAllData && (
                                    <TableCell>
                                        <Typography variant="body2">
                                            {product.cantidad}
                                        </Typography>
                                    </TableCell>
                                )}
                                <TableCell>
                                    <Typography
                                        variant="body2"
                                        fontWeight="bold"
                                        sx={{ color: 'success.main' }}
                                    >
                                        {formatCurrency(product.precio_publico || 0)}
                                    </Typography>
                                </TableCell>
                                <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                        <Tooltip title="Agregar al carrito">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addToCart({
                                                        id: product.id,
                                                        nombre: product.descripcion,
                                                        precio: product.precio_publico || 0
                                                    });
                                                }}
                                                sx={{
                                                    backgroundColor: '#2e7d32',
                                                    color: 'white',
                                                    '&:hover': {
                                                        backgroundColor: '#1b5e20',
                                                    },
                                                    width: 32,
                                                    height: 32,
                                                }}
                                            >
                                                <AddShoppingCartIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>
                                        {isAdmin && (
                                            <IconButton
                                                size="small"
                                                onClick={(e) => handleMenuOpen(e, product.id)}
                                            >
                                                <MoreVertIcon />
                                            </IconButton>
                                        )}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, p: 2 }}>
                <Pagination
                    count={pageData?.totalPages ?? 0}
                    page={page + 1}
                    onChange={handlePageChange}
                    color="primary"
                    showFirstButton
                    showLastButton
                />
            </Box>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                <MenuItem onClick={handleEdit}>
                    <EditIcon sx={{ mr: 1 }} />
                    Editar
                </MenuItem>
                <MenuItem onClick={handleDetailsClick}>
                    <InfoIcon sx={{ mr: 1 }} />
                    Ver detalles
                </MenuItem>
                <MenuItem onClick={handleDeleteClick}>
                    <DeleteIcon sx={{ mr: 1 }} />
                    Eliminar
                </MenuItem>
            </Menu>

            <Dialog open={isConfirmOpen} onClose={handleConfirmClose}>
                <DialogTitle>Confirmar eliminación</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleConfirmClose}>Cancelar</Button>
                    <Button onClick={handleConfirmDelete} color="error" variant="contained">
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={isDetailsOpen} onClose={handleDetailsClose} fullWidth maxWidth="md">
                <DialogTitle>Detalles del Producto</DialogTitle>
                <DialogContent>
                    {selectedProductForDetails && (
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">Código:</Typography>
                                <Typography variant="body1">{selectedProductForDetails.codigoProducto}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">Descripción:</Typography>
                                <Typography variant="body1">{selectedProductForDetails.descripcion}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">Cantidad en Stock:</Typography>
                                <Typography variant="body1">{selectedProductForDetails.cantidad}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">Proveedor:</Typography>
                                <Typography variant="body1">{proveedorMap.get(selectedProductForDetails.proveedorId) ?? 'N/A'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">Rubro:</Typography>
                                <Typography variant="body1">{tipoProductoMap.get(selectedProductForDetails.tipoProductoId) ?? 'N/A'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">Precio Dolar sin IVA:</Typography>
                                <Typography variant="body1">{formatUSD(selectedProductForDetails.precio_sin_iva || 0)}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">IVA:</Typography>
                                <Typography variant="body1">{((selectedProductForDetails.iva || 0.21) * 100)}%</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">% Ganancia:</Typography>
                                <Typography variant="body1">{selectedProductForDetails.porcentaje_ganancia}%</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">Precio Público:</Typography>
                                <Typography variant="body1" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                    {formatCurrency(selectedProductForDetails.precio_publico || 0)}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">Precio USD:</Typography>
                                <Typography variant="body1">{formatUSD(selectedProductForDetails.precio_publico_us || 0)}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">Costo Pesos:</Typography>
                                <Typography variant="body1">{formatCurrency(selectedProductForDetails.costo_pesos || 0)}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">Costo US Con IVA:</Typography>
                                <Typography variant="body1">{formatUSD(selectedProductForDetails.costo_dolares || 0)}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">Resto:</Typography>
                                <Typography variant="body1">{selectedProductForDetails.resto || 'N/A'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">Costo Fijo:</Typography>
                                <Typography variant="body1">{selectedProductForDetails.costoFijo ? 'Sí' : 'No'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">Fecha de Ingreso:</Typography>
                                <Typography variant="body1">{selectedProductForDetails.fecha_ingreso || 'N/A'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">Precio sin Redondear:</Typography>
                                <Typography variant="body1">{formatCurrency(selectedProductForDetails.precio_sin_redondear || 0)}</Typography>
                            </Grid>

                            {relatedProductsForDetail && relatedProductsForDetail.length > 0 && (
                                                            <Grid item xs={12}>
                                                                <Divider sx={{ my: 2 }} />
                                                                <Typography variant="subtitle1" sx={{ mb: 1 }}>Productos Relacionados:</Typography>
                                                                <List dense>
                                                                    {relatedProductsForDetail.map((related) => (
                                                                        <ListItem key={related.id} divider>
                                                                            <ListItemText
                                                                                primary={related.descripcion}
                                                                                secondary={`Proveedor: ${related.nombreProveedor} | Precio: ${formatCurrency(related.precioPublico)}`}
                                                                            />
                                                                        </ListItem>
                                                                    ))}
                                                                </List>
                                                            </Grid>
                                                        )}
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDetailsClose}>Cerrar</Button>
                </DialogActions>
            </Dialog>
            <BulkUploadDialog
                open={isBulkUploadOpen}
                onClose={handleBulkUploadClose}
            />
            {isAdmin && selectedProducts.size > 0 &&(
                <Box sx={{ position: 'fixed', bottom: 16, left: 16, boxShadow: 3, borderRadius: 2, p: 1.5, zIndex: 1000 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<DeleteIcon/>}
                        onClick={handleDeleteList}
                    >
                        Eliminar Productos Seleccionados ({selectedProducts.size})
                    </Button>
                </Box>
            )}
            {selectedProducts.size > 0 && (
                <Box sx={{ position: 'sticky', bottom: 5, my: 2, ml: 'auto', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={handleGenerateCustomPdf}
                    >
                        Generar PDF de seleccionados
                    </Button>
                </Box>
            )}
        </Container>
    );
}

export default ProductListPage;
