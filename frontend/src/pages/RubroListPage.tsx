import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    Container, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, CircularProgress, Alert, Box, Button,
    IconButton, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState } from 'react';

import {fetchTiposProducto, deleteTipoProducto, fetchProducts} from '../api/productsApi';
import type {Producto, TipoProducto} from '../types/Producto';
import { useAuth } from '../hooks/useAuth';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import {generateExcelByCategory} from "../utils/excelExport"
import {generatePdfByCategory} from "../components/GeneratePDF.tsx";
export default function RubroListPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { role } = useAuth();
    const isAdmin = role === 'ADMIN';

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const { data: rubros, error, isLoading } = useQuery<TipoProducto[], Error>({
        queryKey: ['tiposProducto'],
        queryFn: fetchTiposProducto,
    });

    const handleGenerateExcel = async (rubroId: number, rubroNombre: string) => {
        try {
            toast.loading(`Generando Excel de ${rubroNombre}...`, { id: 'excel-export' });

            let allProducts: Producto[] = [];
            let currentPage = 0;
            const pageSize = 100;
            let hasMore = true;

            allProducts.push({ descripcion: String(rubroNombre) } as Producto);

            while (hasMore) {
                const pageData = await fetchProducts(currentPage, pageSize, '', '', String(rubroId));
                allProducts.push(...pageData.content);
                hasMore = pageData.content.length === pageSize;
                currentPage++;
            }

            await generateExcelByCategory(rubroNombre, allProducts);
            toast.success('Excel generado correctamente', { id: 'excel-export' });
        } catch (error) {
            console.error('Error generando Excel:', error);
            toast.error('Error al generar el Excel', { id: 'excel-export' });
        }
    };

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteTipoProducto(id),
        onSuccess: () => {
            toast.success('Rubro eliminado con éxito');
            void queryClient.invalidateQueries({ queryKey: ['tiposProducto'] });
        },
        onError: (err: Error) => toast.error(`Error al eliminar: ${err.message}`),
    });

    const handleDeleteClick = (id: number) => {
        setSelectedId(id);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (selectedId) {
            deleteMutation.mutate(selectedId);
        }
        setIsConfirmOpen(false);
        setSelectedId(null);
    };
    const handleGeneratePdf = async (rubroId: number, rubroNombre: string) => {
        try {
            toast.loading('Generando PDF...', { id: 'pdf-rubro' });

            const allProducts: Producto[] = [];
            let currentPage = 0;
            const pageSize = 100;
            let hasMore = true;

            while (hasMore) {
                const pageData = await fetchProducts(currentPage, pageSize, '', '', rubroId.toString());
                allProducts.push(...pageData.content);
                hasMore = pageData.content.length === pageSize;
                currentPage++;
            }

            await generatePdfByCategory(rubroNombre, allProducts, 'rubro');
            toast.success('PDF generado correctamente', { id: 'pdf-rubro' });
        } catch (error) {
            console.error('Error generando PDF:', error);
            toast.error('Error al generar el PDF', { id: 'pdf-rubro' });
        }
    };
    if (isLoading) {
        return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
    }

    if (error) {
        return <Container sx={{ mt: 4 }}><Alert severity="error">Error al cargar los rubros: {error.message}</Alert></Container>;
    }

    return (
        <Container>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 4 }}>
                <Typography variant="h4">Rubros</Typography>
                {isAdmin && (
                    <Button variant="contained" onClick={() => navigate('/rubros/nuevo')}>
                        Nuevo Rubro
                    </Button>
                )}
            </Box>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Nombre</TableCell>
                            {isAdmin && <TableCell align="right">Acciones</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rubros?.map((rubro) => (
                            <TableRow key={rubro.id} hover>
                                <TableCell>{rubro.id}</TableCell>
                                <TableCell>{rubro.nombre}</TableCell>
                                    <TableCell align="right">
                                        {isAdmin && (
                                        <IconButton onClick={() => navigate(`/rubros/editar/${rubro.id}`)} aria-label="editar">
                                            <EditIcon />
                                        </IconButton>
                                        )}
                                        <IconButton
                                            onClick={() => handleGenerateExcel(rubro.id, rubro.nombre)}
                                            color="success"
                                            aria-label="generar excel"
                                        >
                                            <FileDownloadIcon />
                                        </IconButton>
                                        <IconButton
                                            onClick={() => handleGeneratePdf(rubro.id, rubro.nombre)}
                                            color="primary"
                                            aria-label="generar pdf"
                                        >
                                            <PictureAsPdfIcon />
                                        </IconButton>
                                        {isAdmin && (
                                            <IconButton onClick={() => handleDeleteClick(rubro.id)} color="error" aria-label="eliminar">
                                            <DeleteIcon />
                                        </IconButton>
                                        )}
                                    </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
                <DialogTitle>Confirmar Eliminación</DialogTitle>
                <DialogContent><DialogContentText>¿Estás seguro de que quieres eliminar este rubro?</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsConfirmOpen(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmDelete} color="error" autoFocus>Eliminar</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}