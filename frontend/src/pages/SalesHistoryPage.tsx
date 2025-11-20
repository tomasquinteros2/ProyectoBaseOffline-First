import { useState } from 'react';
import { useQuery, useMutation, onlineManager } from '@tanstack/react-query';
import {
    Container, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, CircularProgress, Alert, Box, Button,
    Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText,
    Divider, TextField
} from '@mui/material';
import { fetchVentas, fetchVentaByNumero } from '../api/salesApi';
import type { Venta, VentaItem } from '../types/Venta';
import { toast } from 'react-hot-toast';

function SalesHistoryPage() {
    const { data: ventas, error, isLoading } = useQuery<Venta[], Error>({
        queryKey: ['ventas'],
        queryFn: fetchVentas,
    });

    const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const searchCloudMutation = useMutation<Venta, Error, string>({
        mutationFn: fetchVentaByNumero,
        onSuccess: (data) => {
            toast.success(`Comprobante ${data.numeroComprobante} encontrado en el archivo histórico.`, { id: 'search-toast' });
            setSelectedVenta(data);
        },
        onError: (_err, variables) => {
            toast.error(`No se encontró el comprobante "${variables}" en el archivo.`, { id: 'search-toast' });
        }
    });

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numeroBuscado = searchTerm.trim();
        if (!numeroBuscado) {
            return;
        }

        const ventaLocal = ventas?.find(v => v.numeroComprobante.toLowerCase() === numeroBuscado.toLowerCase());

        if (ventaLocal) {
            toast.success(`Comprobante ${ventaLocal.numeroComprobante} encontrado en ventas recientes.`);
            setSelectedVenta(ventaLocal);
            return;
        }

        if (onlineManager.isOnline()) {
            toast.loading(`Buscando "${numeroBuscado}" en el archivo histórico...`, { id: 'search-toast' });
            searchCloudMutation.mutate(numeroBuscado);
        } else {
            toast.error('Comprobante no encontrado en datos locales. Se necesita conexión para buscar en el histórico.');
        }
    };

    const handleCloseDetails = () => {
        setSelectedVenta(null);
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);

    if (isLoading) {
        return <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh"><CircularProgress /></Box>;
    }

    if (error) {
        return <Container sx={{ mt: 4 }}><Alert severity="error">Error al cargar el historial de ventas: {error.message}</Alert></Container>;
    }

    if (!Array.isArray(ventas)) {
        console.error("Error inesperado: 'ventas' no es un array. Datos recibidos:", ventas);
        return <Container sx={{ mt: 4 }}><Alert severity="warning">Los datos de ventas no se pudieron procesar. Intente recargar la página.</Alert></Container>;
    }

    return (
        <Container maxWidth="lg">
            <Typography variant="h4" component="h1" sx={{ mt: 4, mb: 2 }}>
                Historial de Ventas
            </Typography>

            <Paper component="form" onSubmit={handleSearchSubmit} sx={{ p: 2, mb: 3, display: 'flex', gap: 2 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    label="Buscar por N° de Comprobante (reciente o archivado)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button
                    type="submit"
                    variant="contained"
                    disabled={searchCloudMutation.isPending || !searchTerm.trim()}
                >
                    {searchCloudMutation.isPending ? <CircularProgress size={24} /> : 'Buscar'}
                </Button>
            </Paper>

            <Typography variant="h5" component="h2" sx={{ mb: 2 }}>Ventas Recientes</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>N° Comprobante</TableCell>
                            <TableCell>Fecha</TableCell>
                            <TableCell align="right">Total</TableCell>
                            <TableCell align="center">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {ventas.length > 0 ? (
                            ventas.map((venta) => (
                                <TableRow key={venta.id} hover>
                                    <TableCell>{venta.numeroComprobante}</TableCell>
                                    <TableCell>{new Date(venta.fechaVenta).toLocaleString('es-AR')}</TableCell>
                                    <TableCell align="right">{formatCurrency(venta.totalVenta)}</TableCell>
                                    <TableCell align="center">
                                        <Button variant="outlined" size="small" onClick={() => setSelectedVenta(venta)}>
                                            Ver Detalles
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} align="center">No hay ventas recientes para mostrar.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={Boolean(selectedVenta)} onClose={handleCloseDetails} fullWidth maxWidth="sm">
                <DialogTitle>Detalles de la Venta</DialogTitle>
                <DialogContent>
                    {selectedVenta && (
                        <>
                            <Typography variant="h6">Comprobante: {selectedVenta.numeroComprobante}</Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Fecha: {new Date(selectedVenta.fechaVenta).toLocaleString('es-AR')}
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <List dense>
                                {selectedVenta.items.map((item: VentaItem) => (
                                    <ListItem key={item.id} disableGutters>
                                        <ListItemText
                                            primary={`${item.cantidad} x ${item.productoDescripcion}`}
                                            secondary={`P. Unit: ${formatCurrency(item.precioUnitario)}`}
                                        />
                                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                            {formatCurrency(item.precioUnitario * item.cantidad)}
                                        </Typography>
                                    </ListItem>
                                ))}
                            </List>
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Typography variant="h6">
                                    Total: {formatCurrency(selectedVenta.totalVenta)}
                                </Typography>
                            </Box>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDetails}>Cerrar</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default SalesHistoryPage;