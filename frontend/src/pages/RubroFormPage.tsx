import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Container, Paper, Typography, TextField, Button, Box, CircularProgress } from '@mui/material';
import { fetchTipoProductoById, createTipoProducto, updateTipoProducto, type TipoProductoPayload } from '../api/productsApi';
import type { TipoProducto } from '../types/Producto';


export default function RubroFormPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { id } = useParams<{ id: string }>();
    const isEditMode = Boolean(id);

    const [nombre, setNombre] = useState('');

    const { data: rubroToEdit, isLoading } = useQuery({
        queryKey: ['tipoProducto', id],
        queryFn: () => fetchTipoProductoById(id!),
        enabled: isEditMode,
    });

    useEffect(() => {
        if (rubroToEdit) {
            setNombre(rubroToEdit.nombre);
        }
    }, [rubroToEdit]);

    const mutation = useMutation<TipoProducto, Error, TipoProductoPayload>({
        mutationFn: (payload: TipoProductoPayload) =>
            isEditMode ? updateTipoProducto({ id: id!, payload }) : createTipoProducto(payload),
        onSuccess: () => {
            toast.success(`Rubro ${isEditMode ? 'actualizado' : 'creado'} con éxito`);
            queryClient.invalidateQueries({ queryKey: ['tiposProducto'] });
            navigate('/rubros');
        },
        onError: (err) => toast.error(`Error: ${err.message}`),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({ nombre });
    };

    if (isLoading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

    return (
        <Container maxWidth="sm" sx={{ mt: 4 }}>
            <Paper component="form" sx={{ p: 4 }} onSubmit={handleSubmit}>
                <Typography variant="h4" gutterBottom>{isEditMode ? 'Editar' : 'Nuevo'} Rubro</Typography>
                <TextField fullWidth required label="Nombre del Rubro" value={nombre} onChange={e => setNombre(e.target.value)} sx={{ mb: 3 }} />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button onClick={() => navigate('/rubros')} color="secondary">Cancelar</Button>
                    <Button type="submit" variant="contained" disabled={mutation.isPending}>
                        {mutation.isPending ? <CircularProgress size={24} /> : 'Guardar'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}