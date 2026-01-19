import {useQuery, useMutation, useQueryClient, onlineManager} from '@tanstack/react-query';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    Container, Typography, CircularProgress, Alert, Box, Button,
    Grid, Card, CardContent, CardActions, Divider, IconButton
} from '@mui/material';
import { AddCircle, Edit, Delete, Visibility, VisibilityOff} from '@mui/icons-material';
import {useRef, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

import { fetchProveedoresDetallados, deleteProveedor, fetchProveedoresLastModified } from '../api/proveedoresApi';
import type { ProveedorDetallado } from '../types/Proveedor';
import ConfirmationDialog from '../components/ConfirmationDialog';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import {generateExcelByCategory} from "../utils/excelExport"
import { fetchProducts, fetchTiposProducto } from '../api/productsApi';
import {generatePdfByCategory} from "../components/GeneratePDF.tsx";
import type { Producto } from '../types/Producto';



export default function ProveedorListPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [proveedorToDelete, setProveedorToDelete] = useState<ProveedorDetallado | null>(null);
    const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
    const { role } = useAuth();
    const isAdmin = role === 'ADMIN';
    const { data: proveedores, error, isLoading, isFetching } = useQuery<ProveedorDetallado[], Error>({
        queryKey: ['proveedoresDetallados'],
        queryFn: fetchProveedoresDetallados,
        staleTime: 0,
        gcTime: onlineManager.isOnline() ? 0 : 1000 * 60 * 60,
        enabled: true,
        placeholderData: (previousData) => previousData
    });


    const deleteMutation = useMutation({
        mutationFn: deleteProveedor,
        onSuccess: () => {
            toast.success('Proveedor eliminado con éxito');
            void queryClient.invalidateQueries({ queryKey: ['proveedoresDetallados'] });
        },
        onError: (err: Error) => toast.error(`Error al eliminar: ${err.message}`),
        onSettled: () => {
            setProveedorToDelete(null);
        }
    });

    const handleConfirmDelete = () => {
        if (proveedorToDelete) {
            deleteMutation.mutate(proveedorToDelete.id);
        }
    };
    const handleGenerateExcel = async (proveedorId: number, proveedorNombre: string) => {
        try {
            toast.loading(`Generando Excel de ${proveedorNombre}...`, { id: 'excel-export' });

            let allProducts: Producto[] = [];
            let currentPage = 0;
            const pageSize = 100;
            let hasMore = true;

            while (hasMore) {
                const pageData = await fetchProducts(currentPage, pageSize, '', String(proveedorId), '');
                allProducts.push(...pageData.content);
                hasMore = pageData.content.length === pageSize;
                currentPage++;
            }

            const tiposProducto = await fetchTiposProducto();
            const tipoMap = new Map(tiposProducto.map(t => [t.id, t.nombre]));

            const groupedProducts = allProducts.reduce((acc, product) => {
                const tipoId = product.tipoProductoId;
                if (!acc[tipoId]) {
                    acc[tipoId] = [];
                }
                acc[tipoId].push(product);
                return acc;
            }, {} as Record<number, Producto[]>);

            const productsForExcel: Producto[] = [];

            for (const tipoId in groupedProducts) {
                const tipoNombre = tipoMap.get(Number(tipoId)) ?? 'Sin Tipo';

                productsForExcel.push({ descripcion: tipoNombre } as Producto);

                productsForExcel.push(...groupedProducts[Number(tipoId)]);
            }

            await generateExcelByCategory(proveedorNombre, productsForExcel);
            toast.success('Excel generado correctamente', { id: 'excel-export' });
        } catch (error) {
            console.error('Error generando Excel:', error);
            toast.error('Error al generar el Excel', { id: 'excel-export' });
        }
    };
    const handleGeneratePdf = async (proveedorId: number, proveedorNombre: string) => {
        try {
            toast.loading('Generando PDF...', { id: 'pdf-proveedor' });

            const allProducts: Producto[] = [];
            let currentPage = 0;
            const pageSize = 100;
            let hasMore = true;

            while (hasMore) {
                const pageData = await fetchProducts(currentPage, pageSize, '', proveedorId.toString(), '');
                allProducts.push(...pageData.content);
                hasMore = pageData.content.length === pageSize;
                currentPage++;
            }

            await generatePdfByCategory(proveedorNombre, allProducts, 'proveedor');
            toast.success('PDF generado correctamente', { id: 'pdf-proveedor' });
        } catch (error) {
            console.error('Error generando PDF:', error);
            toast.error('Error al generar el PDF', { id: 'pdf-proveedor' });
        }
    };
    const handleEdit = (id: number) => {
        navigate(`/proveedores/editar/${id}`);
    };
    const lastKnownProveedoresTimestamp = useRef<number>(0);

    // LOG 2: Query de polling para detectar cambios
    const { data: proveedoresLastModifiedData } = useQuery({
        queryKey: ['proveedoresLastModified'],
        queryFn: () => {
            return fetchProveedoresLastModified();
        },
        refetchInterval: 5000, // Consulta cada 5 segundos
        staleTime: 0,
        enabled: onlineManager.isOnline(),
    });

    useEffect(() => {
        // LOG 3: Se ejecuta el efecto y muestra el timestamp recibido
        if (!proveedoresLastModifiedData) return;

        const newTimestamp = proveedoresLastModifiedData.lastModified;
        const oldTimestamp = lastKnownProveedoresTimestamp.current;

        // LOG 4: Comparación de timestamps

        if (oldTimestamp === 0) {
            lastKnownProveedoresTimestamp.current = newTimestamp;
            return;
        }

        if (newTimestamp > oldTimestamp) {
            // LOG 5: Se detecta un cambio y se procede a invalidar
            lastKnownProveedoresTimestamp.current = newTimestamp;
            void queryClient.invalidateQueries({ queryKey: ['proveedoresDetallados'] });
        }
    }, [proveedoresLastModifiedData, queryClient]);


    if (isLoading) {
        return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
    }

    if (error) {
        return <Container sx={{ mt: 4 }}><Alert severity="error">Error al cargar los proveedores: {error.message}</Alert></Container>;
    }

    return (
        <>
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                {isAdmin && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" component="h1" fontWeight="bold">
                        Gestión de Proveedores
                    </Typography>
                    <Button
                        component={RouterLink}
                        to="/proveedores/nuevo"
                        variant="contained"
                        startIcon={<AddCircle />}
                        size="large"
                    >
                        Nuevo Proveedor
                    </Button>
                </Box>)}

                <Grid container spacing={3}>
                    {proveedores?.map((proveedor) => (
                        <Grid item xs={12} key={proveedor.id}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Typography variant="h5" component="div" fontWeight="500">
                                            {proveedor.nombre}
                                        </Typography>
                                        <CardActions sx={{ p: 0 }}>
                                            {isAdmin && (
                                            <Button
                                                variant="outlined"
                                                startIcon={<Edit />}
                                                onClick={() => handleEdit(proveedor.id)}
                                            >
                                                Editar
                                            </Button>)}
                                            <Button
                                                variant="outlined"
                                                color="success"
                                                startIcon={<FileDownloadIcon />}
                                                onClick={() => handleGenerateExcel(proveedor.id, proveedor.nombre)}
                                            >
                                                Excel
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="primary"
                                                startIcon={<PictureAsPdfIcon />}
                                                onClick={() => handleGeneratePdf(proveedor.id, proveedor.nombre)}
                                            >
                                                PDF
                                            </Button>
                                            {isAdmin && (
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                startIcon={<Delete />}
                                                onClick={() => setProveedorToDelete(proveedor)}
                                            >
                                                Eliminar
                                            </Button>)}
                                        </CardActions>
                                    </Box>

                                    <Divider />

                                    <Grid container spacing={2} sx={{ mt: 1 }}>
                                        <Grid item xs={12} md={4}>
                                            <Typography variant="h6" gutterBottom>Información General</Typography>
                                            <Typography><strong>CUIT:</strong> {proveedor.cuit}</Typography>
                                            <Typography><strong>Dirección:</strong> {`${proveedor.calle} ${proveedor.altura}, ${proveedor.ciudad}, ${proveedor.provincia} (${proveedor.codigoPostal})`}</Typography>
                                            <Typography><strong>Teléfono:</strong> {proveedor.celular ?? proveedor.telefonoFijo}</Typography>
                                            <Typography><strong>Web:</strong> {proveedor.paginaWeb ? <a href={/^https?:\/\//i.test(proveedor.paginaWeb) ? proveedor.paginaWeb : `https://${proveedor.paginaWeb}`} target="_blank" rel="noopener noreferrer">{proveedor.paginaWeb}</a> : '—'}</Typography>                                            <Typography><strong>Usuario Web:</strong> {proveedor.usuarioPagina}</Typography>
                                            <Typography>
                                                <strong>Contraseña Web:</strong>{' '}
                                                <Box component="span" sx={{ fontFamily: 'monospace', mr: 1 }}>
                                                    {showPasswords[proveedor.id]
                                                        ? proveedor.contrasenaPagina
                                                        : (proveedor.contrasenaPagina ? '•'.repeat(proveedor.contrasenaPagina.length) : '—')}
                                                </Box>
                                                <IconButton
                                                    size="small"
                                                    aria-label={showPasswords[proveedor.id] ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                                    onClick={() =>
                                                        setShowPasswords(prev => ({ ...prev, [proveedor.id]: !prev[proveedor.id] }))
                                                    }
                                                >
                                                    {showPasswords[proveedor.id] ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                                </IconButton>
                                            </Typography>
                                        </Grid>

                                        <Grid item xs={12} md={4}>
                                            <Typography variant="h6" gutterBottom>Ventas y Transporte</Typography>
                                            <Typography><strong>Responsable 1:</strong> {proveedor.responsableVentas1}</Typography>
                                            <Typography><strong>Responsable 2:</strong> {proveedor.responsableVentas2}</Typography>
                                            <Typography><strong>Condición de Venta:</strong> {proveedor.condicionVenta}</Typography>
                                            <Typography><strong>Transporte:</strong> {`${proveedor.nombreTransporte} - ${proveedor.domicilioTransporte}`}</Typography>
                                            <Typography><strong>Tel. Transporte:</strong> {proveedor.telefonoTransporte}</Typography>
                                        </Grid>

                                        <Grid item xs={12} md={4}>
                                            <Typography variant="h6" gutterBottom>Condiciones Monetarias</Typography>
                                            <Typography><strong>Moneda:</strong> {proveedor.moneda}</Typography>
                                            <Typography><strong>Tipo Cotización:</strong> {proveedor.tipoCotizacion}</Typography>
                                            {proveedor.tipoCotizacion === 'MANUAL' && <Typography><strong>Valor Cotización:</strong> {proveedor.valorCotizacionManual}</Typography>}
                                            {proveedor.observaciones && <Typography><strong>Observaciones:</strong> {proveedor.observaciones}</Typography>}
                                        </Grid>
                                    </Grid>

                                    <Divider sx={{ my: 2 }} />

                                    <Typography variant="h6" gutterBottom>Razones Sociales</Typography>
                                    {proveedor.razonesSociales.map(razon => (
                                        <Box key={razon.id} sx={{ mb: 2, pl: 2, borderLeft: '3px solid #1976d2', backgroundColor: '#0e1113' }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', p: 1 }}>{razon.nombre}</Typography>
                                            <Box sx={{ pl: 1, pb: 1 }}>
                                                <Typography><strong>Desc. s/ Lista:</strong> {razon.descuentoSobreLista}%</Typography>
                                                <Typography><strong>Desc. s/ Factura:</strong> {razon.descuentoSobreFactura}%</Typography>

                                                <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: '500' }}>Cuentas Bancarias:</Typography>
                                                {razon.cuentasBancarias.map(cuenta => (
                                                    <Box key={cuenta.id} sx={{ pl: 2, mt: 1 }}>
                                                        <Typography><strong>Titular:</strong> {cuenta.titular}</Typography>
                                                        <Typography><strong>CBU/Alias:</strong> {`${cuenta.cbu} / ${cuenta.alias}`}</Typography>
                                                        <Typography><strong>Cuenta:</strong> {`${cuenta.tipoCuenta} - ${cuenta.numeroCuenta}`}</Typography>
                                                    </Box>
                                                ))}
                                            </Box>
                                        </Box>
                                    ))}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Container>

            {proveedorToDelete && (
                <ConfirmationDialog
                    open={!!proveedorToDelete}
                    title="Confirmar Eliminación"
                    content={`¿Estás seguro de que quieres eliminar al proveedor "${proveedorToDelete.nombre}"? Esta acción no se puede deshacer.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setProveedorToDelete(null)}
                />
            )}
        </>
    );
}
