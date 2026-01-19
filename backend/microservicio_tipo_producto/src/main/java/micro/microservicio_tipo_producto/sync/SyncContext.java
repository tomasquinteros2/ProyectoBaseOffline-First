package micro.microservicio_tipo_producto.sync;

public class SyncContext {
    private static final ThreadLocal<Boolean> isSyncing = ThreadLocal.withInitial(() -> false);

    public static void setSyncing(boolean syncing) {
        isSyncing.set(syncing);
    }

    public static boolean isSyncing() {
        return isSyncing.get();
    }
}