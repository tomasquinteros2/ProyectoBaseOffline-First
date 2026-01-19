import { useEffect, useMemo, useState } from 'react';
import { Chip, Tooltip, CircularProgress } from '@mui/material';
import { useIsMutating, useQueryClient, onlineManager, useQuery } from '@tanstack/react-query';
import { fetchSyncStatus } from '../api/productsApi';
import type { SyncStatus } from '../types/Sync';

interface SyncState {
    sincronizado: boolean;
    pendingTotal: number;
    serverPending: number;
    hasError: boolean;
    isOnline: boolean;
}

function SyncStatusIndicator() {
    const queryClient = useQueryClient();
    const { data: syncStatus, isError: syncError } = useQuery<SyncStatus>({
        queryKey: ['syncStatus'],
        queryFn: fetchSyncStatus,
        refetchInterval: 5000,
        enabled: onlineManager.isOnline(),
    });

    const clientPending = useIsMutating();
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const unsubscribe = queryClient.getMutationCache().subscribe(() => {
            const anyError = queryClient
                .getMutationCache()
                .getAll()
                .some((m) => m?.state?.status === 'error');
            setHasError(anyError);
        });
        return () => {
            unsubscribe?.();
        };
    }, [queryClient]);

    const isOnline = onlineManager.isOnline();

    const syncState: SyncState = useMemo(() => {
        const serverPending = syncStatus?.batchToSendCount ?? 0;
        const serverErrors = (syncStatus?.batchInErrorCount ?? 0) > 0;
        const serverReady = syncStatus
            ? syncStatus.started
            && syncStatus.syncEnabled
            && syncStatus.registered
            && syncStatus.initialLoaded
            : true;

        const pendingTotal = clientPending + serverPending;
        const errorState = hasError || syncError || serverErrors;

        return {
            sincronizado: isOnline && serverReady && pendingTotal === 0 && !errorState,
            pendingTotal,
            serverPending,
            hasError: errorState,
            isOnline,
        };
    }, [clientPending, hasError, isOnline, syncError, syncStatus]);

    if (!syncState.isOnline) {
        return (
            <Tooltip title="Sin conexión. Los cambios se sincronizarán al reconectar.">
                <Chip size="small" label="Offline" color="default" variant="outlined" sx={{ ml: 1 }} />
            </Tooltip>
        );
    }

    if (syncState.hasError) {
        return (
            <Tooltip title="Error en la sincronización. Revisa batches en error.">
                <Chip size="small" label="Error de sync" color="error" sx={{ ml: 1 }} />
            </Tooltip>
        );
    }

    if (syncState.pendingTotal > 0 || !syncState.sincronizado) {
        return (
            <Tooltip title={`Sincronizando (local ${clientPending} / servidor ${syncState.serverPending})...`}>
                <Chip
                    size="small"
                    label={`Sync (${syncState.pendingTotal})`}
                    color="warning"
                    icon={<CircularProgress size={14} color="inherit" />}
                    sx={{ ml: 1 }}
                />
            </Tooltip>
        );
    }

    return (
        <Tooltip title="Todos los cambios están sincronizados.">
            <Chip size="small" label="Sincronizado" color="success" sx={{ ml: 1 }} />
        </Tooltip>
    );
}

export default SyncStatusIndicator;