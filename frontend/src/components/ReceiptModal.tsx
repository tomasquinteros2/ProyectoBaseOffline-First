import {
    Dialog, DialogContent, DialogTitle, Box, Typography,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Button, DialogActions
} from '@mui/material';
import type { Venta } from '../types/Venta';

interface ReceiptModalProps {
    open: boolean;
    onClose: () => void;
    venta: Venta | null;
}

const receiptStyles = `
    /* Contenedor principal con fondo blanco */
    #printable-receipt {
        background-color: #fff !important;
        color: #000 !important;
        font-family: 'Courier New', Courier, monospace;
        max-width: 100%;
        margin: 0 auto;
        padding: 20px;
        position: relative;
        overflow: hidden;
    }

    /* Forzar todo el texto a negro */
    #printable-receipt * {
        color: #000 !important;
    }

    /* Encabezado minimalista */
    .comprobante-header {
        text-align: center;
        padding-bottom: 10px;
        margin-bottom: 10px;
    }

    .empresa-nombre {
        font-weight: bold;
        font-size: 1.2rem;
        letter-spacing: 0.5px;
    }

    /* Información de encabezado en dos columnas */
    .encabezado-container {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        margin-bottom: 15px;
    }

    .info-empresa {
        text-align: left;
        min-width: 50%;
        margin-bottom: 10px;
    }

    .info-comprobante {
        text-align: right;
        min-width: 40%;
    }

    /* Tabla responsiva con fondo blanco */
    .table-container {
        width: 100%;
        overflow-x: auto;
        background-color: #fff !important;
    }

    .comprobante-tabla {
        width: 100%;
        border-collapse: collapse;
        min-width: 600px;
        background-color: #fff !important;
    }

    /* Eliminar cualquier fondo oscuro en celdas */
    .comprobante-tabla th {
        font-weight: bold;
        padding: 8px 5px;
        border-bottom: 2px solid #000;
        text-align: left;
        font-size: 0.9rem;
        background-color: #fff !important;
    }

    .comprobante-tabla td {
        padding: 8px 5px;
        border-bottom: 1px solid #ddd;
        font-size: 0.85rem;
        word-break: break-word;
        background-color: #fff !important;
    }

    /* Columnas específicas */
    .col-codigo {
        width: 15%;
        min-width: 60px;
    }
    
    .col-descripcion {
        width: 35%;
        min-width: 120px;
    }
    
    .col-cantidad {
        width: 15%;
        min-width: 60px;
    }
    
    .col-precio {
        width: 15%;
        min-width: 80px;
    }
    
    .col-subtotal {
        width: 20%;
        min-width: 90px;
    }

    /* Alineaciones específicas */
    .text-right {
        text-align: right;
    }

    /* Total destacado */
    .total-container {
        text-align: right;
        font-weight: bold;
        margin-top: 15px;
        padding-top: 10px;
        font-size: 1.1rem;
        overflow-wrap: break-word;
        background-color: #fff !important;
    }

    /* Reglas para impresión */
    @media print {
        body * {
            visibility: hidden;
        }
        #printable-receipt, #printable-receipt * {
            visibility: visible;
            background-color: #fff !important;
            color: #000 !important;
        }
        #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none;
            border: none;
            overflow: visible !important;
        }
        .no-imprimir {
            display: none !important;
        }
        .MuiDialog-paper {
            box-shadow: none;
            border: none;
            margin: 0;
            padding: 0;
            width: 100% !important;
            max-width: 100% !important;
            background-color: #fff !important;
        }
        .table-container {
            overflow-x: visible !important;
            background-color: #fff !important;
        }
        .comprobante-tabla {
            min-width: 100% !important;
            width: 100% !important;
            background-color: #fff !important;
        }
        .comprobante-tabla th,
        .comprobante-tabla td {
            background-color: #fff !important;
            color: #000 !important;
        }
    }

    @media (max-width: 768px) {
        .encabezado-container {
            flex-direction: column;
        }
        .info-empresa, .info-comprobante {
            min-width: 100%;
            text-align: center;
            margin-bottom: 15px;
        }
    }
`;

export default function ReceiptModal({ open, onClose, venta }: ReceiptModalProps) {

    const handlePrint = () => {
        window.print();
    };

    if (!venta) return null;

    return (
        <>
            <style>{receiptStyles}</style>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        overflow: 'visible',
                        bgcolor: '#fff'
                    }
                }}
            >
                <Box id="printable-receipt">
                    <DialogTitle className="comprobante-header" sx={{ p: 2, bgcolor: '#fff' }}>
                        <Typography className="empresa-nombre">REMITO DE ENTREGA DE MERCADERIA</Typography>
                    </DialogTitle>

                    <DialogContent sx={{ py: 1, bgcolor: '#fff' }}>
                        <Box className="encabezado-container" sx={{ bgcolor: '#fff' }}>
                            <Box className="info-empresa">
                                <Typography variant="body1" fontWeight="bold">ECO PILA</Typography>
                                <Typography variant="body2">SARMIENTO 658</Typography>
                                <Typography variant="body2">TANDIL</Typography>
                            </Box>
                            <Box className="info-comprobante">
                                <Typography variant="body2">Comprobante: {venta.numeroComprobante}</Typography>
                                <Typography variant="body2">Fecha: {new Date(venta.fechaVenta).toLocaleDateString('es-AR')}</Typography>
                            </Box>
                        </Box>

                        <Box className="table-container">
                            <TableContainer component={Paper} elevation={0} sx={{ bgcolor: '#fff' }}>
                                <Table size="small" className="comprobante-tabla" sx={{ bgcolor: '#fff' }}>
                                    <TableHead sx={{ bgcolor: '#fff' }}>
                                        <TableRow>
                                            <TableCell className="col-codigo" sx={{ bgcolor: '#fff' }}>CÓDIGO</TableCell>
                                            <TableCell className="col-descripcion" sx={{ bgcolor: '#fff' }}>PRODUCTO</TableCell>
                                            <TableCell className="col-cantidad text-right" sx={{ bgcolor: '#fff' }}>CANTIDAD</TableCell>
                                            <TableCell className="col-precio text-right" sx={{ bgcolor: '#fff' }}>PRECIO</TableCell>
                                            <TableCell className="col-subtotal text-right" sx={{ bgcolor: '#fff' }}>SUBTOTAL</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody sx={{ bgcolor: '#fff' }}>
                                        {venta.items.map((item) => (
                                            <TableRow key={item.id} sx={{ bgcolor: '#fff' }}>
                                                <TableCell className="col-codigo" sx={{ bgcolor: '#fff' }}>{item.id}</TableCell>
                                                <TableCell className="col-descripcion" sx={{ bgcolor: '#fff' }}>{item.productoDescripcion}</TableCell>
                                                <TableCell className="col-cantidad text-right" sx={{ bgcolor: '#fff' }}>{item.cantidad}</TableCell>
                                                <TableCell className="col-precio text-right" sx={{ bgcolor: '#fff' }}>${item.precioUnitario?.toLocaleString('es-AR', { minimumFractionDigits: 2 }) ?? 'N/D'}</TableCell>
                                                <TableCell className="col-subtotal text-right" sx={{ bgcolor: '#fff' }}>${(item.precioUnitario * item.cantidad).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>

                        <Box className="total-container">
                            <Typography variant="h6">
                                TOTAL CONTADO: ${venta.totalVenta?.toLocaleString('es-AR', { minimumFractionDigits: 2 }) ?? 'N/D'}
                            </Typography>
                        </Box>
                    </DialogContent>
                </Box>

                <DialogActions className="no-imprimir" sx={{ p: 3, justifyContent: 'center', bgcolor: '#fff' }}>
                    <Button
                        onClick={handlePrint}
                        variant="contained"
                        color="primary"
                        sx={{ mr: 2, fontWeight: 'bold', bgcolor: '#000', color: '#fff !important' }}
                    >
                        IMPRIMIR
                    </Button>
                    <Button
                        onClick={onClose}
                        variant="outlined"
                        color="inherit"
                        sx={{ fontWeight: 'bold', color: '#000 !important', borderColor: '#000' }}
                    >
                        CERRAR
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}