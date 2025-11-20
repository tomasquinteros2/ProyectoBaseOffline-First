import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    TextField, CircularProgress, Alert
} from '@mui/material';

import { createProveedor } from '../api/proveedoresApi';
import type { ProveedorPayload, ProveedorDetallado } from '../types/Proveedor';
import { CondicionVenta, Moneda, TipoCotizacion } from '../types/Proveedor';

interface CreateProveedorDialogProps {
    open: boolean;
    onClose: (newProveedor?: ProveedorDetallado) => void;
}

export default function CreateProveedorDialog({ open, onClose }: CreateProveedorDialogProps) {
    const queryClient = useQueryClient();
    const [nombre, setNombre] = useState('');

    useEffect(() => {
        if (!open) setNombre('');
    }, [open]);

    const mutation = useMutation({
        mutationFn: createProveedor,
        onSuccess: (data) => {
            toast.success(`Proveedor "${data.nombre}" creado con éxito.`);
            void queryClient.invalidateQueries({ queryKey: ['proveedoresDetallados'] });
            void queryClient.invalidateQueries({ queryKey: ['proveedores'] });
            onClose(data);
        },
        onError: (error: Error) => {
            toast.error(`No se pudo crear el proveedor: ${error.message}`);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: ProveedorPayload = {
            nombre: nombre.trim(),
            cuit: '',
            calle: '',
            altura: '',
            codigoPostal: '',
            provincia: '',
            ciudad: '',
            telefonoFijo: '',
            celular: '',
            nombreTransporte: '',
            domicilioTransporte: '',
            telefonoTransporte: '',
            paginaWeb: '',
            usuarioPagina: '',
            contrasenaPagina: '',
            responsableVentas1: '',
            responsableVentas2: '',
            condicionVenta: CondicionVenta.DEPOSITO_ANTICIPADO,
            moneda: Moneda.PESOS,
            tipoCotizacion: TipoCotizacion.MERCADO,
            valorCotizacionManual: 0,
            observaciones: '',
            razonesSociales: []
        };
        mutation.mutate(payload);
    };

    return (
        <Dialog open={open} onClose={() => onClose()} component="form" onSubmit={handleSubmit}>
            <DialogTitle>Crear Nuevo Proveedor (Rápido)</DialogTitle>
            <DialogContent sx={{ pt: '8px !important' }}>
                <TextField
                    autoFocus
                    required
                    margin="dense"
                    label="Nombre del Proveedor"
                    fullWidth
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    disabled={mutation.isPending}
                    helperText="Los detalles adicionales se pueden agregar más tarde."
                />
                {mutation.isError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {mutation.error.message}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose()} disabled={mutation.isPending}>Cancelar</Button>
                <Button type="submit" variant="contained" disabled={!nombre.trim() || mutation.isPending}>
                    {mutation.isPending ? <CircularProgress size={24} /> : 'Crear Proveedor'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}