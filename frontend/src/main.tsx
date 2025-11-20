import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthProvider';
import { CartProvider } from './context/CartProvider.tsx';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createIDBPersister } from './utils/idb-persister';
import { setupOnlineManager } from './utils/online-manager.ts';
import { createProduct, updateProduct, deleteProduct } from './api/productsApi.ts';
import { onlineManager } from '@tanstack/react-query';
import './index.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            networkMode: 'offlineFirst',
            refetchOnWindowFocus: true,
            refetchOnMount: true,
            refetchOnReconnect: true,
            staleTime: 0,  // Siempre considerar datos como stale
            gcTime: 1000 * 60 * 60 * 24,
            retry: (failureCount, error) => {
                if (!onlineManager.isOnline()) return false;
                return failureCount < 3;
            },
        },
        mutations: {
            networkMode: 'offlineFirst',
        },
    },
});

setupOnlineManager(queryClient);

queryClient.setMutationDefaults(['createProduct'], { mutationFn: createProduct });
queryClient.setMutationDefaults(['updateProduct'], { mutationFn: updateProduct });
queryClient.setMutationDefaults(['deleteProduct'], { mutationFn: deleteProduct });

const persister = createIDBPersister('reactQuery');

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister }}
        >
            <AuthProvider>
                <CartProvider>
                    <App />
                </CartProvider>
            </AuthProvider>
        </PersistQueryClientProvider>
    </React.StrictMode>,
);