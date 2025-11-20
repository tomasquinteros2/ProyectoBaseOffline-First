import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    TextField, CircularProgress, Alert
} from '@mui/material';
import { createTipoProducto } from '../api/productsApi';
import type { TipoProductoPayload } from '../api/productsApi';
import type { TipoProducto } from '../types/Producto';

interface CreateTipoProductoDialogProps {
    open: boolean;
    onClose: (newTipo?: TipoProducto) => void;
}

export default function CreateTipoProductoDialog({ open, onClose }: CreateTipoProductoDialogProps) {
    const [nombre, setNombre] = useState('');

    const mutation = useMutation({
        mutationFn: createTipoProducto,
        onSuccess: (data) => {
            toast.success(`Tipo de producto "${data.nombre}" creado con éxito.`);
            onClose(data);
        },
        onError: (error) => {
            toast.error(`No se pudo crear el tipo de producto: ${error.message}`);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: TipoProductoPayload = {
            nombre: nombre.trim(),
        };
        mutation.mutate(payload);
    };

    return (
        <Dialog open={open} onClose={() => onClose()} component="form" onSubmit={handleSubmit}>
            <DialogTitle>Crear Nuevo Tipo de Producto</DialogTitle>
            <DialogContent sx={{ pt: '8px !important' }}>
                <TextField
                    autoFocus
                    required
                    margin="dense"
                    id="nombre"
                    label="Nombre del Tipo de Producto"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    disabled={mutation.isPending}
                />
                {mutation.isError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {mutation.error.message}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose()} disabled={mutation.isPending}>Cancelar</Button>
                <Button
                    type="submit"
                    variant="contained"
                    disabled={!nombre.trim() || mutation.isPending}
                >
                    {mutation.isPending ? <CircularProgress size={24} /> : 'Crear'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}