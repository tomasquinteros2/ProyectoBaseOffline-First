import { useState, useEffect, useMemo } from 'react';
import { useNavigate,useLocation, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
    Container, Typography, TextField, Button, Box, Grid, Paper,
    CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem,
    Autocomplete, Tooltip, IconButton, List, ListItem, ListItemText,
    FormControlLabel, Switch, FormHelperText
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import CalculateIcon from '@mui/icons-material/Calculate';

import {
    fetchProductById,
    fetchProveedores,
    fetchTiposProducto,
    createProduct,
    updateProduct,
    fetchRelatedProducts,
    relateProduct,
    unrelateProduct,
    type ProductPayload,
    type ProductRelationPayload, fetchProducts
} from '../api/productsApi';
import { fetchDolar, type Dolar } from '../api/dolarApi';
import type { Proveedor, TipoProducto, Producto, RelatedProductResult } from '../types/Producto';
import CreateProveedorDialog from '../components/CreateProveedorDialog';
import CreateTipoProductoDialog from '../components/CreateTipoProductoDialog';

const ivaOptions = [
    { value: 0.21, label: '21% (General)' },
    { value: 0.105, label: '10.5% (Bienes de Capital)' },
];

type ProductMutationContext = {
    previousProducts?: Producto[];
    previousProduct?: Producto;
};
type RelationMutationContext = {
    previousRelated?: RelatedProductResult[];
};

function ProductFormPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { id } = useParams<{ id: string }>();
    const isEditMode = Boolean(id);

    const [codigo, setCodigo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [cantidad, setCantidad] = useState('1');
    const [porcentajeGanancia, setPorcentajeGanancia] = useState('30');
    const [iva, setIva] = useState<number>(0.21);
    const [resto, setResto] = useState('100');
    const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);
    const [selectedTipo, setSelectedTipo] = useState<TipoProducto | null>(null);
    const [isCreateProveedorOpen, setIsCreateProveedorOpen] = useState(false);
    const [isCreateTipoOpen, setIsCreateTipoOpen] = useState(false);
    const [productToRelate, setProductToRelate] = useState<Producto | null>(null);
    const [productsToRelateOnCreate, setProductsToRelateOnCreate] = useState<Producto[]>([]);

    const returnPath = (location.state as { returnPath?: string })?.returnPath ?? '/productos';

    const [costoFijo, setCostoFijo] = useState(false);
    const [costoSinIva, setCostoSinIva] = useState('0');
    const [costoPesos, setCostoPesos] = useState('0');

    const [arsToUsdInput, setArsToUsdInput] = useState('');

    const { data: productToEdit, isLoading: isLoadingProduct } = useQuery({
        queryKey: ['product', id],
        queryFn: () => fetchProductById(id!),
        enabled: isEditMode,
    });

    const { data: proveedores, isLoading: isLoadingProveedores } = useQuery({ queryKey: ['proveedores'], queryFn: fetchProveedores });
    const { data: tiposProducto, isLoading: isLoadingTipos } = useQuery({ queryKey: ['tiposProducto'], queryFn: fetchTiposProducto });
    /*const { data: allProducts } = useQuery<Producto[]>({
        queryKey: ['allProducts'],
        queryFn: fetchAllProductsForExport
    });*/
    const { data: productsToRelate } = useQuery({
        queryKey: ['productsToRelate'],
        queryFn: () => fetchProducts(0, 1000),
        select: (data) => data.content,
    });
    const { data: relatedProducts, isLoading: isLoadingRelated } = useQuery<RelatedProductResult[]>({
        queryKey: ['relatedProducts', id],
        queryFn: () => fetchRelatedProducts(id!),
        enabled: isEditMode,
    });

    const { data: dolarData, isLoading: isLoadingDolar } = useQuery<Dolar[]>({
        queryKey: ['dolar'],
        queryFn: fetchDolar,
        staleTime: 1000 * 60 * 60,
        refetchOnWindowFocus: false,
    });

    const dolarValue = useMemo(() => dolarData?.[0]?.precio, [dolarData]);


    useEffect(() => {
        if (isEditMode && productToEdit && proveedores && tiposProducto) {
            setCodigo(productToEdit.codigoProducto);
            setDescripcion(productToEdit.descripcion);
            setCantidad(String(productToEdit.cantidad));
            setPorcentajeGanancia(String(productToEdit.porcentaje_ganancia));
            setIva(productToEdit.iva);
            setResto(String(productToEdit.resto || 100));
            setSelectedProveedor(proveedores.find(p => p.id === productToEdit.proveedorId) || null);
            setSelectedTipo(tiposProducto.find(t => t.id === productToEdit.tipoProductoId) || null);

            setCostoFijo(productToEdit.costoFijo);
            if (productToEdit.costoFijo) {
                setCostoPesos(String(productToEdit.costo_pesos));
                setCostoSinIva('0');
            } else {
                setCostoSinIva(String(productToEdit.precio_sin_iva));
                setCostoPesos('0');
            }
        }
    }, [productToEdit, isEditMode, proveedores, tiposProducto]);

    const createMutation = useMutation<Producto, Error, ProductPayload, ProductMutationContext>({
        mutationFn: createProduct,
        onMutate: async (newProductPayload) => {
            await queryClient.cancelQueries({ queryKey: ['products'] });
            const previousProducts = queryClient.getQueryData<Producto[]>(['products']);
            const optimisticProduct: Producto = {
                id: `temp-${Date.now()}`,
                ...newProductPayload,
                costo_dolares: 0, costo_pesos: 0, precio_publico: 0, resto: 0,
                precio_sin_redondear: 0, precio_publico_us: 0,
                fecha_ingreso: new Date().toISOString(),
                productosRelacionados: [], productosRelacionadosIds: [],
            };
            queryClient.setQueryData<Producto[]>(['products'], (old = []) => [...old, optimisticProduct]);
            toast.success('Producto guardado localmente.');

            navigate(-1);
            return { previousProducts };
        },
        onSuccess: (createdProduct) => {
            toast.success('Nuevo producto sincronizado con el servidor.');
            queryClient.invalidateQueries({ queryKey: ['products'] });
            if (productsToRelateOnCreate.length > 0 && typeof createdProduct.id === 'number') {
                toast.loading('Creando relaciones...', { id: 'relating-toast' });
                const relationPromises = productsToRelateOnCreate.map(productToRelate =>
                    relateProduct({
                        productoId: createdProduct.id as number,
                        productoRelacionadoId: productToRelate.id as number,
                    })
                );

                Promise.all(relationPromises)
                    .then(() => toast.success('Relaciones creadas exitosamente.', { id: 'relating-toast' }))
                    .catch(() => toast.error('Falló la creación de algunas relaciones.', { id: 'relating-toast' }));
            }
        },
        onError: (_err, _newProduct, context) => {
            if (context?.previousProducts) {
                queryClient.setQueryData(['products'], context.previousProducts);
            }
            toast.error("Falló la sincronización del nuevo producto.");
        },
    });

    const updateMutation = useMutation<Producto, Error, { id: string, payload: ProductPayload }, ProductMutationContext>({
        mutationFn: updateProduct,
        onMutate: async ({ id: productId, payload }) => {
            console.log("Iniciando mutación optimista para actualizar producto ID:", productId, "con datos:", payload);
            await queryClient.cancelQueries({ queryKey: ['products'] });
            await queryClient.cancelQueries({ queryKey: ['product', productId] });
            const previousProducts = queryClient.getQueryData<Producto[]>(['products']);
            const previousProduct = queryClient.getQueryData<Producto>(['product', productId]);

            if (previousProducts) {
                queryClient.setQueryData<Producto[]>(['products'], (old) =>
                    old?.map((p) =>
                        p.id == productId
                            ? { ...p, ...payload, resto: payload.resto ?? p.resto }
                            : p
                    ) ?? []
                );
            }
            if (previousProduct) {
                queryClient.setQueryData<Producto>(['product', productId], (old) =>
                    old ? { ...old, ...payload, resto: payload.resto ?? old.resto } : undefined
                );
            }

            toast.success('Cambios guardados localmente.');
            navigate(-1);
            return { previousProducts, previousProduct };
        },
        onSuccess: (_data, { id: productId }) => {
            toast.success('Producto actualizado y sincronizado.');
            void queryClient.invalidateQueries({ queryKey: ['products'] });
            void queryClient.invalidateQueries({ queryKey: ['product', productId] });
        },
        onError: (_err, { id: productId }, context) => {
            if (context?.previousProducts) queryClient.setQueryData(['products'], context.previousProducts);
            if (context?.previousProduct) queryClient.setQueryData(['product', productId], context.previousProduct);
            toast.error("Falló la sincronización de los cambios.");
        },
    });

    const relateMutation = useMutation<void, Error, ProductRelationPayload, RelationMutationContext>({
        mutationFn: relateProduct,
        onMutate: async (newRelation) => {
            await queryClient.cancelQueries({ queryKey: ['relatedProducts', id] });
            const previousRelated = queryClient.getQueryData<RelatedProductResult[]>(['relatedProducts', id]);

            const productToAdd = productsToRelate?.find(p => p.id === newRelation.productoRelacionadoId);
            if (productToAdd) {
                const optimisticRelatedProduct: RelatedProductResult = {
                    id: productToAdd.id as number,
                    descripcion: productToAdd.descripcion,
                    nombreProveedor: proveedores?.find(p => p.id === productToAdd.proveedorId)?.nombre ?? 'N/D',
                    precioPublico: productToAdd.precio_publico,
                    nombreTipoProducto: tiposProducto?.find(t => t.id === productToAdd.tipoProductoId)?.nombre ?? 'N/D',
                };
                queryClient.setQueryData<RelatedProductResult[]>(['relatedProducts', id], (old = []) => [...old, optimisticRelatedProduct]);
            }
            toast.success('Relación añadida.');
            setProductToRelate(null);
            return { previousRelated };
        },
        onError: (_err, _newRelation, context) => {
            if (context?.previousRelated) {
                queryClient.setQueryData(['relatedProducts', id], context.previousRelated);
            }
            toast.error('No se pudo añadir la relación.');
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['relatedProducts', id] });
        },
    });

    const unrelateMutation = useMutation<void, Error, ProductRelationPayload, RelationMutationContext>({
        mutationFn: unrelateProduct,
        onMutate: async (relationToRemove) => {
            await queryClient.cancelQueries({ queryKey: ['relatedProducts', id] });
            const previousRelated = queryClient.getQueryData<RelatedProductResult[]>(['relatedProducts', id]);
            queryClient.setQueryData<RelatedProductResult[]>(
                ['relatedProducts', id],
                (old = []) => old.filter(p => p.id !== relationToRemove.productoRelacionadoId)
            );
            toast.success('Relación eliminada.');
            return { previousRelated };
        },
        onError: (_err, _newRelation, context) => {
            if (context?.previousRelated) {
                queryClient.setQueryData(['relatedProducts', id], context.previousRelated);
            }
            toast.error('No se pudo eliminar la relación.');
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['relatedProducts', id] });
        },
    });

    const availableProductsToRelate = useMemo(() => {
        if (!productsToRelate || (isEditMode && !productToEdit)) {
            return [];
        }

        const existingIds = new Set(
            isEditMode
                ? relatedProducts?.map(p => p.id)
                : productsToRelateOnCreate.map(p => p.id as number)
        );

        const currentTipoProductoId = isEditMode ? productToEdit?.tipoProductoId : null;

        return productsToRelate.filter(p => {
            const isSameProduct = isEditMode && p.id.toString() === id;
            if (isSameProduct) return false;

            const isAlreadyRelated = existingIds.has(p.id as number);
            if (isAlreadyRelated) return false;

            const isRealProduct = typeof p.id === 'number';
            if (!isRealProduct) return false;

            if (isEditMode) {
                return currentTipoProductoId ? p.tipoProductoId === currentTipoProductoId : false;
            } else {
                return true;
            }
        });
    }, [productsToRelate, relatedProducts, productsToRelateOnCreate, id, isEditMode, productToEdit]);


    const handleCreateProveedorClose = (newProveedor?: Proveedor) => {
        setIsCreateProveedorOpen(false);
        if (newProveedor) {
            void queryClient.invalidateQueries({ queryKey: ['proveedores'] });
            setSelectedProveedor(newProveedor);
        }
    };

    const handleCreateTipoClose = (newTipo?: TipoProducto) => {
        setIsCreateTipoOpen(false);
        if (newTipo) {
            void queryClient.invalidateQueries({ queryKey: ['tiposProducto'] });
            setSelectedTipo(newTipo);
        }
    };

    const handleCalculateUsdFromArs = () => {
        if (!dolarValue || dolarValue <= 0) {
            toast.error('No se pudo obtener un valor de dólar válido para calcular.');
            return;
        }
        const arsValue = parseFloat(arsToUsdInput);
        if (isNaN(arsValue) || arsValue <= 0) {
            toast.error('Ingrese un monto válido en pesos.');
            return;
        }

        const usdValue = arsValue / dolarValue;
        setCostoSinIva(usdValue.toFixed(4));
        toast.success(`Costo USD calculado: $${usdValue.toFixed(4)}`);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedProveedor || !selectedTipo) {
            toast.error('Por favor, seleccione un proveedor y un tipo de producto.');
            return;
        }

        const payload: ProductPayload = {
            codigoProducto: codigo,
            descripcion: descripcion,
            cantidad: parseFloat(cantidad) || 1,
            proveedorId: selectedProveedor.id,
            tipoProductoId: selectedTipo.id,
            porcentaje_ganancia: parseFloat(porcentajeGanancia) || 0,
            iva: iva,
            resto: parseFloat(resto) || null,
            costoFijo: costoFijo,
            costo_pesos: costoFijo ? (parseFloat(costoPesos) || 0) : 0,
            precio_sin_iva: !costoFijo ? (parseFloat(costoSinIva) || 0) : 0,
        };

        if (isEditMode && id) {
            updateMutation.mutate({ id, payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleAddRelation = () => {
        if (!productToRelate) {
            toast.error('Seleccione un producto para relacionar.');
            return;
        }

        if (isEditMode) {
            if (!id || typeof productToRelate.id !== 'number' || typeof +id !== 'number') {
                toast.error('No se puede relacionar un producto no sincronizado.');
                return;
            }
            const payload: ProductRelationPayload = {
                productoId: +id,
                productoRelacionadoId: productToRelate.id,
            };
            relateMutation.mutate(payload);
        } else {
            setProductsToRelateOnCreate(prev => [...prev, productToRelate]);
            setProductToRelate(null);
        }
    };

    const handleRemoveRelation = (productIdToRemove: number) => {
        if (isEditMode) {
            if (!id || typeof +id !== 'number') return;
            const payload: ProductRelationPayload = {
                productoId: +id,
                productoRelacionadoId: productIdToRemove,
            };
            unrelateMutation.mutate(payload);
        } else {
            setProductsToRelateOnCreate(prev => prev.filter(p => p.id !== productIdToRemove));
        }
    };
    const handleCancel = () => {
        // Recuperar estado guardado
        const savedState = sessionStorage.getItem('productListState');

        if (savedState) {
            const state = JSON.parse(savedState);
            sessionStorage.removeItem('productListState');

            // Construir URL con parámetros
            const params = new URLSearchParams();
            if (state.page) params.set('page', state.page);
            if (state.searchInput) params.set('search', state.searchInput);
            if (state.proveedorFilter) params.set('proveedor', state.proveedorFilter);
            if (state.tipoFilter) params.set('tipo', state.tipoFilter);

            navigate(`/productos?${params.toString()}`);
        } else {
            navigate('/productos');
        }
    };
    const areSelectsLoading = isLoadingProveedores || isLoadingTipos;
    const isProcessing = createMutation.isPending || updateMutation.isPending || isLoadingProduct;

    return (
        <>
            <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                <Paper sx={{ p: { xs: 2, sm: 4 } }}>
                    <Typography variant="h4" component="h1" gutterBottom>
                        {isEditMode ? 'Editar Producto' : 'Nuevo Producto'}
                    </Typography>
                    <form onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth name="codigoProducto" label="Código del Producto" value={codigo} onChange={(e) => setCodigo(e.target.value)} disabled={isProcessing} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField required fullWidth name="descripcion" label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} disabled={isProcessing} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField required fullWidth name="cantidad" label="Cantidad (Stock)" type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} disabled={isProcessing} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={costoFijo}
                                            onChange={(e) => setCostoFijo(e.target.checked)}
                                            name="costoFijo"
                                            color="primary"
                                            disabled={isProcessing}
                                        />
                                    }
                                    label="Usar Costo Fijo en Pesos (ARS)"
                                />
                                <FormHelperText>
                                    Activado: el costo en ARS no cambiará con el dólar. Desactivado: el costo se basa en USD.
                                </FormHelperText>
                            </Grid>

                            {costoFijo ? (
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        required
                                        fullWidth
                                        name="costo_pesos"
                                        label="Costo Fijo (ARS)"
                                        type="number"
                                        value={costoPesos}
                                        onChange={(e) => setCostoPesos(e.target.value)}
                                        disabled={isProcessing}
                                        InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>$</Typography> }}
                                    />
                                </Grid>
                            ) : (
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        required
                                        fullWidth
                                        name="precio_sin_iva"
                                        label="Costo sin IVA (USD)"
                                        type="number"
                                        value={costoSinIva}
                                        onChange={(e) => setCostoSinIva(e.target.value)}
                                        disabled={isProcessing}
                                        InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>$</Typography> }}
                                    />
                                </Grid>
                            )}
                            {!costoFijo && (
                                <Grid item xs={12} sm={6}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <TextField
                                            label="Calcular desde ARS"
                                            size="small"
                                            type="number"
                                            value={arsToUsdInput}
                                            onChange={(e) => setArsToUsdInput(e.target.value)}
                                            disabled={isProcessing || isLoadingDolar}
                                            InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>$</Typography> }}
                                        />
                                        <Tooltip title={!dolarValue ? "Obteniendo valor del dólar..." : `Calcular usando dólar a $${dolarValue}`}>
                                            <span>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={handleCalculateUsdFromArs}
                                                    disabled={isProcessing || isLoadingDolar || !dolarValue || !arsToUsdInput}
                                                    startIcon={<CalculateIcon />}
                                                >
                                                    Calcular
                                                </Button>
                                            </span>
                                        </Tooltip>
                                    </Box>
                                    <FormHelperText>
                                        Ingrese un monto en pesos para convertirlo a costo en dólares.
                                    </FormHelperText>
                                </Grid>
                            )}

                            <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Autocomplete
                                    fullWidth
                                    options={proveedores ?? []}
                                    getOptionLabel={(option) => option.nombre}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    value={selectedProveedor}
                                    onChange={(_event, newValue) => setSelectedProveedor(newValue)}
                                    disabled={areSelectsLoading || isProcessing}
                                    renderInput={(params) => <TextField {...params} required label="Proveedor" />}
                                />
                                <Tooltip title="Crear Nuevo Proveedor">
                                    <IconButton color="primary" onClick={() => setIsCreateProveedorOpen(true)} disabled={isProcessing}>
                                        <AddCircleOutlineIcon />
                                    </IconButton>
                                </Tooltip>
                            </Grid>
                            <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Autocomplete
                                    fullWidth
                                    options={tiposProducto ?? []}
                                    getOptionLabel={(option) => option.nombre}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    value={selectedTipo}
                                    onChange={(_event, newValue) => setSelectedTipo(newValue)}
                                    disabled={areSelectsLoading || isProcessing}
                                    renderInput={(params) => <TextField {...params} required label="Tipo de Producto" />}
                                />
                                <Tooltip title="Crear Nuevo Rubro">
                                    <IconButton color="primary" onClick={() => setIsCreateTipoOpen(true)} disabled={isProcessing}>
                                        <AddCircleOutlineIcon />
                                    </IconButton>
                                </Tooltip>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField required fullWidth name="porcentaje_ganancia" label="Porcentaje Ganancia (ej: 30)" type="number" value={porcentajeGanancia} onChange={(e) => setPorcentajeGanancia(e.target.value)} disabled={isProcessing} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth required disabled={isProcessing}>
                                    <InputLabel id="iva-select-label">IVA</InputLabel>
                                    <Select labelId="iva-select-label" name="iva" value={iva} label="IVA" onChange={(e) => setIva(e.target.value as number)}>
                                        {ivaOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            {(createMutation.isError || updateMutation.isError) && (
                                <Grid item xs={12}>
                                    <Alert severity="error">No se pudo guardar el producto. Por favor, inténtalo de nuevo.</Alert>
                                </Grid>
                            )}
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    name="resto"
                                    label="Redondear Precio a (ej: 100)"
                                    type="number"
                                    value={resto}
                                    onChange={(e) => setResto(e.target.value)}
                                    disabled={isProcessing}
                                    helperText="Múltiplo para redondear el precio final. Dejar en 0 para no redondear."
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                                    <Button onClick={() => navigate(-1)} color="secondary" disabled={isProcessing}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" variant="contained" disabled={areSelectsLoading || isProcessing}>
                                        {isProcessing ? <CircularProgress size={24} /> : 'Guardar'}
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </form>
                </Paper>

                <Paper sx={{ p: { xs: 2, sm: 4 }, mt: 4 }}>
                    <Typography variant="h5" component="h2" gutterBottom>
                        Productos Relacionados
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Agrupe este producto con otros similares para comparar precios entre proveedores.
                    </Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={8}>
                            <Autocomplete
                                fullWidth
                                options={availableProductsToRelate}
                                getOptionLabel={(option) => `${option.codigoProducto} - ${option.descripcion}`}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                value={productToRelate}
                                onChange={(_event, newValue) => setProductToRelate(newValue)}
                                disabled={relateMutation.isPending || !productsToRelate}
                                renderInput={(params) => <TextField {...params} label="Buscar producto para relacionar" />}
                                noOptionsText="No hay productos disponibles para relacionar"
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={handleAddRelation}
                                disabled={!productToRelate || relateMutation.isPending}
                                startIcon={relateMutation.isPending ? <CircularProgress size={20} /> : <AddCircleOutlineIcon />}
                            >
                                Añadir Relación
                            </Button>
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 3 }}>
                        {isEditMode ? (
                            <>
                                {isLoadingRelated && <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>}
                                {relatedProducts && relatedProducts.length > 0 ? (
                                    <List>
                                        {relatedProducts.map((related) => (
                                            <ListItem key={related.id} secondaryAction={
                                                <Tooltip title="Eliminar relación">
                                                    <IconButton edge="end" onClick={() => handleRemoveRelation(related.id)} disabled={unrelateMutation.isPending}>
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            } divider>
                                                <ListItemText
                                                    primary={related.descripcion}
                                                    secondary={`Proveedor: ${related.nombreProveedor} | Precio: $${related.precioPublico.toFixed(2)}`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    !isLoadingRelated && <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Este producto no tiene relaciones.</Typography>
                                )}
                            </>
                        ) : (
                            <>
                                {productsToRelateOnCreate.length > 0 ? (
                                    <List>
                                        {productsToRelateOnCreate.map((product) => (
                                            <ListItem key={product.id} secondaryAction={
                                                <Tooltip title="Quitar de la lista">
                                                    <IconButton edge="end" onClick={() => handleRemoveRelation(product.id as number)}>
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            } divider>
                                                <ListItemText
                                                    primary={product.descripcion}
                                                    secondary={`Se relacionará al guardar. Código: ${product.codigoProducto}`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Seleccione productos para relacionarlos al guardar.</Typography>
                                )}
                            </>
                        )}
                    </Box>
                </Paper>
            </Container>

            <CreateProveedorDialog open={isCreateProveedorOpen} onClose={handleCreateProveedorClose} />
            <CreateTipoProductoDialog open={isCreateTipoOpen} onClose={handleCreateTipoClose} />
        </>
    );
}

export default ProductFormPage;