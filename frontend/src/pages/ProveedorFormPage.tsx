import { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
    Container, Paper, Typography, Grid, TextField, Button, Box, CircularProgress,
    Select, MenuItem, FormControl, InputLabel, IconButton, Divider, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { Add, Delete, ExpandMore } from '@mui/icons-material';

import { fetchProveedorById, createProveedor, updateProveedor } from '../api/proveedoresApi';
import {
    type ProveedorPayload, CondicionVenta, Moneda, TipoCotizacion, TipoCuenta
} from '../types/Proveedor';

const defaultValues: ProveedorPayload = {
    nombre: '',
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
    razonesSociales: [],
};

function ProveedorFormPage() {
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: proveedorToEdit, isLoading: isLoadingProveedor } = useQuery({
        queryKey: ['proveedorDetallado', id],
        queryFn: () => fetchProveedorById(Number(id)),
        enabled: isEditMode,
    });

    const { control, handleSubmit, reset, watch } = useForm<ProveedorPayload>({ defaultValues });

    const { fields: razonesSocialesFields, append: appendRazonSocial, remove: removeRazonSocial } = useFieldArray({
        control,
        name: 'razonesSociales',
    });

    const tipoCotizacion = watch('tipoCotizacion');

    useEffect(() => {
        if (isEditMode && proveedorToEdit) {
            reset(proveedorToEdit);
        }
    }, [isEditMode, proveedorToEdit, reset]);

    const mutation = useMutation({
        mutationFn: (data: ProveedorPayload) =>
            isEditMode ? updateProveedor({ id: Number(id), payload: data }) : createProveedor(data),
        onSuccess: () => {
            toast.success(`Proveedor ${isEditMode ? 'actualizado' : 'creado'} con éxito.`);
            queryClient.invalidateQueries({ queryKey: ['proveedoresDetallados'] });
            navigate('/proveedores');
        },
        onError: (error) => {
            toast.error(`Error: ${error.message}`);
        },
    });

    const onSubmit = (data: ProveedorPayload) => {
        if (data.tipoCotizacion === TipoCotizacion.MERCADO) {
            data.valorCotizacionManual = 0;
        } else {
            data.valorCotizacionManual = Number(data.valorCotizacionManual);
        }
        mutation.mutate(data);
    };

    if (isLoadingProveedor) {
        return <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh"><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth="md" sx={{ my: 4 }}>
            <Paper sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                <Typography variant="h4" gutterBottom>{isEditMode ? 'Editar Proveedor' : 'Nuevo Proveedor'}</Typography>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMore />}><Typography variant="h6">Datos Principales</Typography></AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}><Controller name="nombre" control={control} render={({ field }) => <TextField {...field} label="Nombre Proveedor" fullWidth required />} /></Grid>
                                <Grid item xs={12} sm={6}><Controller name="cuit" control={control} render={({ field }) => <TextField {...field} label="CUIT" fullWidth />} /></Grid>
                                <Grid item xs={12} sm={8}><Controller name="calle" control={control} render={({ field }) => <TextField {...field} label="Calle" fullWidth />} /></Grid>
                                <Grid item xs={12} sm={4}><Controller name="altura" control={control} render={({ field }) => <TextField {...field} label="Altura" fullWidth />} /></Grid>
                                <Grid item xs={12} sm={4}><Controller name="codigoPostal" control={control} render={({ field }) => <TextField {...field} label="Cód. Postal" fullWidth />} /></Grid>
                                <Grid item xs={12} sm={4}><Controller name="ciudad" control={control} render={({ field }) => <TextField {...field} label="Ciudad" fullWidth />} /></Grid>
                                <Grid item xs={12} sm={4}><Controller name="provincia" control={control} render={({ field }) => <TextField {...field} label="Provincia" fullWidth />} /></Grid>
                                <Grid item xs={12} sm={6}><Controller name="telefonoFijo" control={control} render={({ field }) => <TextField {...field} label="Teléfono Fijo" fullWidth />} /></Grid>
                                <Grid item xs={12} sm={6}><Controller name="celular" control={control} render={({ field }) => <TextField {...field} label="Celular" fullWidth />} /></Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}><Typography variant="h6">Datos Comerciales y Web</Typography></AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}><Controller name="paginaWeb" control={control} render={({ field }) => <TextField {...field} label="Página Web" fullWidth />} /></Grid>
                                <Grid item xs={12} sm={3}><Controller name="usuarioPagina" control={control} render={({ field }) => <TextField {...field} label="Usuario Web" fullWidth />} /></Grid>
                                <Grid item xs={12} sm={3}><Controller name="contrasenaPagina" control={control} render={({ field }) => <TextField {...field} label="Contraseña Web" type="password" fullWidth />} /></Grid>
                                <Grid item xs={12} sm={6}><Controller name="responsableVentas1" control={control} render={({ field }) => <TextField {...field} label="Responsable Ventas 1" fullWidth />} /></Grid>
                                <Grid item xs={12} sm={6}><Controller name="responsableVentas2" control={control} render={({ field }) => <TextField {...field} label="Responsable Ventas 2" fullWidth />} /></Grid>
                                <Grid item xs={12} sm={3}>
                                    <FormControl fullWidth><InputLabel>Condición Venta</InputLabel>
                                        <Controller name="condicionVenta" control={control} render={({ field }) => (
                                            <Select {...field} label="Condición Venta">
                                                {Object.values(CondicionVenta).map(v => <MenuItem key={v} value={v}>{v.replace(/_/g, ' ')}</MenuItem>)}
                                            </Select>
                                        )} />
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <FormControl fullWidth><InputLabel>Moneda</InputLabel>
                                        <Controller name="moneda" control={control} render={({ field }) => (
                                            <Select {...field} label="Moneda">
                                                {Object.values(Moneda).map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                                            </Select>
                                        )} />
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <FormControl fullWidth><InputLabel>Cotización</InputLabel>
                                        <Controller name="tipoCotizacion" control={control} render={({ field }) => (
                                            <Select {...field} label="Cotización">
                                                {Object.values(TipoCotizacion).map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                                            </Select>
                                        )} />
                                    </FormControl>
                                </Grid>
                                {tipoCotizacion === TipoCotizacion.MANUAL && (
                                    <Grid item xs={12} sm={3}>
                                        <Controller
                                            name="valorCotizacionManual"
                                            control={control}
                                            render={({ field: { onChange, value, ...field } }) => (
                                                <TextField
                                                    {...field}
                                                    value={value ?? ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        onChange(val === '' ? 0 : Number(val));
                                                    }}
                                                    label="Valor Manual"
                                                    type="number"
                                                    fullWidth
                                                    inputProps={{ step: '1' }}
                                                />
                                            )}
                                        />
                                    </Grid>
                                )}
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}><Typography variant="h6">Transporte</Typography></AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}><Controller name="nombreTransporte" control={control} render={({ field }) => <TextField {...field} label="Nombre Transporte" fullWidth />} /></Grid>
                                <Grid item xs={12} sm={4}><Controller name="domicilioTransporte" control={control} render={({ field }) => <TextField {...field} label="Domicilio Transporte" fullWidth />} /></Grid>
                                <Grid item xs={12} sm={4}><Controller name="telefonoTransporte" control={control} render={({ field }) => <TextField {...field} label="Teléfono Transporte" fullWidth />} /></Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMore />}><Typography variant="h6">Razones Sociales y Cuentas</Typography></AccordionSummary>
                        <AccordionDetails>
                            {razonesSocialesFields.map((razonSocial, index) => (
                                <Paper key={razonSocial.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Typography variant="subtitle1">Razón Social {index + 1}</Typography>
                                        <IconButton onClick={() => removeRazonSocial(index)} color="error"><Delete /></IconButton>
                                    </Box>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}><Controller name={`razonesSociales.${index}.nombre`} control={control} render={({ field }) => <TextField {...field} label="Razón Social" fullWidth required />} /></Grid>
                                        <Grid item xs={6}><Controller name={`razonesSociales.${index}.descuentoSobreLista`} control={control} render={({ field }) => <TextField {...field} label="Dto. s/ Lista" fullWidth />} /></Grid>
                                        <Grid item xs={6}><Controller name={`razonesSociales.${index}.descuentoSobreFactura`} control={control} render={({ field }) => <TextField {...field} label="Dto. s/ Factura" fullWidth />} /></Grid>
                                    </Grid>
                                    <CuentasBancariasFieldArray control={control} razonSocialIndex={index} />
                                </Paper>
                            ))}
                            <Button startIcon={<Add />} onClick={() => appendRazonSocial({ nombre: '', descuentoSobreLista: '', descuentoSobreFactura: '', cuentasBancarias: [] })}>
                                Añadir Razón Social
                            </Button>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}><Typography variant="h6">Observaciones</Typography></AccordionSummary>
                        <AccordionDetails>
                            <Controller name="observaciones" control={control} render={({ field }) => <TextField {...field} label="Observaciones" multiline rows={4} fullWidth />} />
                        </AccordionDetails>
                    </Accordion>

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Button onClick={() => navigate('/proveedores')} color="secondary" disabled={mutation.isPending}>Cancelar</Button>
                        <Button type="submit" variant="contained" disabled={mutation.isPending}>
                            {mutation.isPending ? <CircularProgress size={24} /> : (isEditMode ? 'Guardar Cambios' : 'Crear Proveedor')}
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Container>
    );
}

function CuentasBancariasFieldArray({ control, razonSocialIndex }: { control: any, razonSocialIndex: number }) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `razonesSociales.${razonSocialIndex}.cuentasBancarias`
    });

    return (
        <Box mt={2} pl={2} borderLeft="2px solid #eee">
            <Typography variant="subtitle2" gutterBottom>Cuentas Bancarias</Typography>
            {fields.map((cuenta, cuentaIndex) => (
                <Box key={cuenta.id} mb={2}>
                    <Grid container spacing={1} alignItems="center">
                        <Grid item xs={11}>
                            <Grid container spacing={1}>
                                <Grid item xs={12} sm={6}><Controller name={`razonesSociales.${razonSocialIndex}.cuentasBancarias.${cuentaIndex}.cbu`} control={control} render={({ field }) => <TextField {...field} label="CBU" size="small" fullWidth />} /></Grid>
                                <Grid item xs={12} sm={6}><Controller name={`razonesSociales.${razonSocialIndex}.cuentasBancarias.${cuentaIndex}.alias`} control={control} render={({ field }) => <TextField {...field} label="Alias" size="small" fullWidth />} /></Grid>
                                <Grid item xs={12} sm={4}>
                                    <FormControl fullWidth size="small"><InputLabel>Tipo</InputLabel>
                                        <Controller name={`razonesSociales.${razonSocialIndex}.cuentasBancarias.${cuentaIndex}.tipoCuenta`} control={control} render={({ field }) => (
                                            <Select {...field} label="Tipo" defaultValue={TipoCuenta.CAJA_AHORRO_PESOS}>
                                                {Object.values(TipoCuenta).map(v => <MenuItem key={v} value={v}>{v.replace(/_/g, ' ')}</MenuItem>)}
                                            </Select>
                                        )} />
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={4}><Controller name={`razonesSociales.${razonSocialIndex}.cuentasBancarias.${cuentaIndex}.numeroCuenta`} control={control} render={({ field }) => <TextField {...field} label="N° Cuenta" size="small" fullWidth />} /></Grid>
                                <Grid item xs={12} sm={4}><Controller name={`razonesSociales.${razonSocialIndex}.cuentasBancarias.${cuentaIndex}.titular`} control={control} render={({ field }) => <TextField {...field} label="Titular" size="small" fullWidth />} /></Grid>
                            </Grid>
                        </Grid>
                        <Grid item xs={1}><IconButton onClick={() => remove(cuentaIndex)} size="small" color="error"><Delete /></IconButton></Grid>
                    </Grid>
                </Box>
            ))}
            <Button size="small" startIcon={<Add />} onClick={() => append({ cbu: '', alias: '', tipoCuenta: TipoCuenta.CAJA_AHORRO_PESOS, numeroCuenta: '', titular: '' })}>
                Añadir Cuenta
            </Button>
        </Box>
    );
}

export default ProveedorFormPage;