import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { get, set, del } from 'idb-keyval';
import { onlineManager } from '@tanstack/react-query';

export function createIDBPersister(idbValidKey: string = 'reactQuery'): Persister {
    return {
        persistClient: async (client: PersistedClient) => {
            // Siempre persistir para uso offline
            await set(idbValidKey, client);
        },
        restoreClient: async () => {
            // Solo restaurar del cache si estamos offline
            if (!onlineManager.isOnline()) {
                return await get<PersistedClient>(idbValidKey);
            }
            return undefined;
        },
        removeClient: async () => {
            await del(idbValidKey);
        },
    };
}