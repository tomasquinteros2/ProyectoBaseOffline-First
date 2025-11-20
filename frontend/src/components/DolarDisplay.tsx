import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Chip, Skeleton, Tooltip, Box, IconButton, CircularProgress } from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { toast } from 'react-hot-toast';
import { fetchDolar, forceDolarUpdate, type Dolar } from '../api/dolarApi';

export default function DolarDisplay() {
    const queryClient = useQueryClient();

    const { data, isLoading, isError, error } = useQuery<Dolar[]>({
        queryKey: ['dolar'],
        queryFn: fetchDolar,
        staleTime: 0,
        refetchInterval: 1000 * 30,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchIntervalInBackground: true,
        gcTime: 0
    });

    const forceUpdateMutation = useMutation({
        mutationFn: forceDolarUpdate,
        onSuccess: async (data) => {
            toast.success(data.message || 'Solicitud de actualización enviada.');
            await queryClient.invalidateQueries({ queryKey: ['dolar'] });
            setTimeout(async () => {
                await queryClient.invalidateQueries({ queryKey: ['dolar'] });
            }, 2000);
        },
        onError: (error) => {
            toast.error(`Error al forzar la actualización: ${error.message}`);
        },
    });

    if (isLoading) {
        return <Skeleton variant="rounded" width={100} height={32} sx={{ bgcolor: 'grey.700' }} />;
    }
    if (isError) {
        return (
            <Tooltip title={`Error de red: ${error.message}`}>
                <Chip
                    icon={<AttachMoneyIcon />}
                    label="Error"
                    color="error"
                    variant="outlined"
                    size="small"
                />
            </Tooltip>
        );
    }

    const dolarValue = data?.[0]?.precio;
    const dolarNombre = data?.[0]?.nombre || "Valor del Dólar Actual";

    if (typeof dolarValue !== 'number' || dolarValue <= 0) {
        return (
            <Tooltip title="No se pudo obtener un valor de dólar válido desde el servidor.">
                <Chip
                    icon={<ErrorOutlineIcon />}
                    label="N/A"
                    color="warning"
                    variant="outlined"
                />
            </Tooltip>
        );
    }

    const formattedDolar = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
    }).format(dolarValue);

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={dolarNombre}>
                <Chip
                    icon={<AttachMoneyIcon />}
                    label={formattedDolar}
                    color="secondary"
                    variant="outlined"
                />
            </Tooltip>
            <Tooltip title="Forzar Actualización">
                <IconButton
                    size="small"
                    onClick={() => forceUpdateMutation.mutate()}
                    disabled={forceUpdateMutation.isPending}
                    aria-label="forzar actualización del dólar"
                >
                    {forceUpdateMutation.isPending ? (
                        <CircularProgress size={20} color="inherit" />
                    ) : (
                        <RefreshIcon fontSize="small" />
                    )}
                </IconButton>
            </Tooltip>
        </Box>
    );
}