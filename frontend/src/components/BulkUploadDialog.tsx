import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
    CircularProgress, List, ListItemText, Alert, Chip, FormControl,
    InputLabel, Select, MenuItem, Tooltip, IconButton
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

import { bulkUploadProducts, fetchProveedores, fetchTiposProducto, createBulkTiposProducto, type ProductPayload } from '../api/productsApi';
import type { Proveedor, TipoProducto } from '../types/Producto';
import CreateProveedorDialog from './CreateProveedorDialog';

interface BulkUploadDialogProps {
    open: boolean;
    onClose: (uploaded: boolean) => void;
}

interface CsvRow {
    CODIGO: string;
    DESCRIPCION: string;
    'US S/IVA': string;
    '%GAN': string;
    IVA: string;
    [key: string]: string;
}

const parseLocaleNumber = (stringValue: string | number | undefined): number => {
    if (typeof stringValue === 'number') return stringValue;
    if (typeof stringValue !== 'string' || !stringValue) return 0;
    const sanitizedString = stringValue.replace(',', '.');
    const number = parseFloat(sanitizedString);
    return isNaN(number) ? 0 : number;
};


export default function BulkUploadDialog({ open, onClose }: BulkUploadDialogProps) {
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [productsToUpload, setProductsToUpload] = useState<ProductPayload[]>([]);
    const [parsingErrors, setParsingErrors] = useState<string[]>([]);
    const [selectedProveedorId, setSelectedProveedorId] = useState<number | 'fromFile' | ''>('');
    const [isCreateProveedorOpen, setIsCreateProveedorOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const { data: proveedores, isLoading: isLoadingProveedores } = useQuery<Proveedor[]>({ queryKey: ['proveedores'], queryFn: fetchProveedores });
    const { data: tiposProducto } = useQuery<TipoProducto[]>({ queryKey: ['tiposProducto'], queryFn: fetchTiposProducto });

    const bulkUploadMutation = useMutation({
        mutationFn: bulkUploadProducts,
        onSuccess: () => {
            toast.success('¡Productos cargados masivamente con éxito!');
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['allProducts'] });
            handleClose(true);
        },
        onError: (error) => {
            toast.error(`Error en la carga masiva: ${error.message}`);
        },
    });

    const createBulkTiposMutation = useMutation({
        mutationFn: createBulkTiposProducto,
        onSuccess: () => {
            toast.success('¡Nuevos rubros creados con éxito!', { id: 'creating-rubros' });
            return queryClient.invalidateQueries({ queryKey: ['tiposProducto'] });
        },
        onError: (error) => {
            toast.error(`Error al crear rubros: ${error.message}`, { id: 'creating-rubros' });
        }
    });

    const resetState = () => {
        setFile(null);
        setProductsToUpload([]);
        setParsingErrors([]);
        setSelectedProveedorId('');
        setIsProcessing(false);
    };

    const handleClose = (uploaded = false) => {
        resetState();
        onClose(uploaded);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setProductsToUpload([]);
        setParsingErrors([]);
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    const handleCreateProveedorClose = (newProveedor?: Proveedor) => {
        setIsCreateProveedorOpen(false);
        if (newProveedor) {
            queryClient.invalidateQueries({ queryKey: ['proveedores'] });
            setSelectedProveedorId(newProveedor.id);
            toast.success(`Proveedor "${newProveedor.nombre}" creado y seleccionado.`);
        }
    };

    const parseFile = useCallback(async (fileToParse: File) => {
        if (!selectedProveedorId) {
            toast.error("Por favor, seleccione un proveedor o use proveedores del archivo.");
            setFile(null);
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            return;
        }

        setIsProcessing(true);
        setProductsToUpload([]);
        setParsingErrors([]);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<CsvRow>(worksheet);

                const proveedores = await fetchProveedores();
                const proveedorMap = new Map(proveedores.map(p => [p.nombre.toLowerCase(), p.id]));

                const existingRubroNames = new Set(tiposProducto?.map(t => t.nombre.toLowerCase()) ?? []);
                const requiredRubroNames = new Set<string>();
                jsonData.forEach(row => {
                    if (!row.CODIGO && !row['US S/IVA'] && !row['%GAN'] && !row.IVA) {
                        requiredRubroNames.add(row.DESCRIPCION.trim());
                    }
                });

                const missingRubroNames = [...requiredRubroNames].filter(name => name && !existingRubroNames.has(name.toLowerCase()));

                if (missingRubroNames.length > 0) {
                    toast.loading(`Creando ${missingRubroNames.length} nuevo(s) rubro(s)...`, { id: 'creating-rubros' });
                    const newRubrosPayload = missingRubroNames.map(nombre => ({ nombre }));
                    await createBulkTiposMutation.mutateAsync(newRubrosPayload);
                }

                const finalTiposProducto = await queryClient.ensureQueryData<TipoProducto[]>({ queryKey: ['tiposProducto'] });
                const tipoProductoMap = new Map(finalTiposProducto.map(t => [t.nombre.toLowerCase(), t.id]));
                let currentTipoProductoName = '';
                const newProducts: ProductPayload[] = [];
                const localErrors: string[] = [];

                jsonData.forEach((row, index) => {
                    const lineNumber = index + 2;
                    if (!row.CODIGO && !row['US S/IVA'] && !row['%GAN'] && !row.IVA) {
                        currentTipoProductoName = row.DESCRIPCION.trim();
                        return;
                    }

                    const tipoProductoId = tipoProductoMap.get(currentTipoProductoName.toLowerCase());
                    if (!tipoProductoId) {
                        localErrors.push(`Línea ${lineNumber}: Error, no se encontró el rubro "${currentTipoProductoName}" después de la creación.`);
                        return;
                    }
                    let proveedorId: number | undefined;
                    if(row.PROVEEDOR){
                        const nombreProveedor = row.PROVEEDOR.toString().toLowerCase();
                        proveedorId = proveedorMap.get(nombreProveedor);
                    }
                    let codigoProducto: string;
                    if(!row.CODIGO){
                        codigoProducto = '';
                    }
                    else{
                        codigoProducto = String(row.CODIGO).trim();
                    }
                    const descripcion = String(row.DESCRIPCION).trim();

                    const precio_sin_iva = parseLocaleNumber(String(row['US S/IVA']).replace('$', '').trim());
                    const porcentaje_ganancia = parseLocaleNumber(row['%GAN']) || 30;

                    let iva = parseLocaleNumber(row.IVA);
                    if (iva >= 1) {
                        iva = iva - 1;
                    } else if (iva === 0) {
                        iva = 0.21;
                    }

                    iva = Math.round(iva * 10000) / 10000;

                    const resto = row.RES ? parseInt(String(row.RES).trim(), 10) : null;

                    if (!descripcion) {
                        localErrors.push(`Línea ${lineNumber}: Faltan código o descripción.`);
                        return;
                    }

                    const productPayload: ProductPayload = {
                        codigoProducto: codigoProducto,
                        descripcion: descripcion,
                        cantidad: 1,
                        proveedorId: proveedorId ?? selectedProveedorId,
                        tipoProductoId: tipoProductoId,
                        precio_sin_iva: precio_sin_iva,
                        porcentaje_ganancia: porcentaje_ganancia,
                        iva: iva,
                        resto: resto,
                        costoFijo: false,
                        costo_pesos: 0,
                    };

                    newProducts.push(productPayload);
                });

                console.log("--- Productos leídos del archivo para cargar ---");
                console.table(newProducts);

                setProductsToUpload(newProducts);
                setParsingErrors(localErrors);

            } catch (error) {
                toast.error(`Ocurrió un error al procesar el archivo: ${(error as Error).message}`);
                setParsingErrors(['El archivo parece estar dañado o no tiene el formato esperado.']);
            } finally {
                setIsProcessing(false);
            }
        };

        reader.onerror = () => {
            toast.error('No se pudo leer el archivo.');
            setIsProcessing(false);
        };

        reader.readAsArrayBuffer(fileToParse);

    }, [selectedProveedorId, tiposProducto, queryClient, createBulkTiposMutation]);

    const handleUpload = () => {
        if (productsToUpload.length > 0) {
            bulkUploadMutation.mutate(productsToUpload);
        } else {
            toast.error("No hay productos válidos para cargar.");
        }
    };

    return (
        <>
            <Dialog open={open} onClose={() => handleClose(false)} fullWidth maxWidth="md">
                <DialogTitle>Carga de Productos desde Excel</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FormControl fullWidth required disabled={isLoadingProveedores || bulkUploadMutation.isPending || isProcessing}>
                                <InputLabel id="proveedor-select-label">Proveedor del Archivo</InputLabel>
                                <Select
                                    labelId="proveedor-select-label"
                                    value={selectedProveedorId}
                                    label="Proveedor del Archivo"
                                    onChange={(e) => setSelectedProveedorId(e.target.value as number | 'fromFile')}
                                >
                                    <MenuItem value="fromFile">
                                        <em>Usar proveedores del archivo</em>
                                    </MenuItem>
                                    {proveedores?.map((p) => (
                                        <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Tooltip title="Crear Nuevo Proveedor">
                                <IconButton color="primary" onClick={() => setIsCreateProveedorOpen(true)} disabled={bulkUploadMutation.isPending || isProcessing}>
                                    <AddCircleOutlineIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        {isProcessing ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, justifyContent: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                                <CircularProgress size={24} />
                                <Typography>Procesando archivo...</Typography>
                            </Box>
                        ) : (
                            <Button
                                variant="outlined"
                                component="label"
                                startIcon={<UploadFileIcon />}
                                disabled={bulkUploadMutation.isPending || isProcessing}
                            >
                                Seleccionar Archivo Excel
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    hidden
                                    onChange={handleFileChange}
                                />
                            </Button>
                        )}

                        {file && <Chip label={`Archivo: ${file.name}`} onDelete={() => resetState()} />}
                        {parsingErrors.length > 0 && (
                            <Alert severity="error" sx={{ maxHeight: 150, overflowY: 'auto' }}>
                                <Typography variant="h6">Errores encontrados:</Typography>
                                <List dense>{parsingErrors.map((err, i) => <ListItemText key={i} primary={err} />)}</List>
                            </Alert>
                        )}
                        {productsToUpload.length > 0 && (
                            <Alert severity="success">
                                <Typography>
                                    Se encontraron <strong>{productsToUpload.length}</strong> productos válidos para cargar.
                                </Typography>
                            </Alert>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => handleClose(false)} color="secondary" disabled={bulkUploadMutation.isPending || isProcessing}>Cancelar</Button>
                    <Button
                        onClick={handleUpload}
                        variant="contained"
                        disabled={!selectedProveedorId || productsToUpload.length === 0 || parsingErrors.length > 0 || bulkUploadMutation.isPending || isProcessing}
                    >
                        {bulkUploadMutation.isPending || isProcessing ? <CircularProgress size={24} /> : `Cargar ${productsToUpload.length} Productos`}
                    </Button>
                </DialogActions>
            </Dialog>
            <CreateProveedorDialog open={isCreateProveedorOpen} onClose={handleCreateProveedorClose} />
        </>
    );
}