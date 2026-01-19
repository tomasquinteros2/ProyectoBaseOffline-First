package micro.microservicio_producto.sync;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.persistence.PostPersist;
import jakarta.persistence.PostRemove;
import jakarta.persistence.PostUpdate;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.File;
import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

// @Component
@NoArgsConstructor
@Slf4j
public class OneDriveListener {

    private static final ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private static volatile SyncProperties props;

    // Thread-local para evitar exportaciones duplicadas dentro de la misma transacción/hilo
    private static final ThreadLocal<Set<String>> exportedKeys = ThreadLocal.withInitial(HashSet::new);

    public static void setSyncProperties(SyncProperties p) {
        props = p;
        if (p != null) {
            log.info("🔁 SyncProperties inyectado en OneDriveListener: {}", p.getNodeId());
        } else {
            log.warn("🔁 SyncProperties seteado a null en OneDriveListener.");
        }
    }

    // @PostPersist
    // @PostUpdate
    public void onSave(Object entity) {
        exportChange(entity, "SAVE");
    }

    // @PostRemove
    public void onDelete(Object entity) {
        exportChange(entity, "DELETE");
    }

    public static void exportChange(Object entity, String action) {
        if (SyncContext.isSyncing()) return;

        // Obtener props (fallback similar al original)
        SyncProperties syncProps = getSyncProperties();
        if (syncProps == null) {
            log.warn("🔕 Omitiendo exportación (SyncProperties no disponible). Entidad: {} acción: {}", entity.getClass().getSimpleName(), action);
            return;
        }

        // clave para deduplicar: clase:id:acción (si id no está, usamos identityHashCode)
        String idPart = extractId(entity);
        String key = entity.getClass().getName() + ":" + idPart + ":" + action;

        Set<String> set = exportedKeys.get();
        if (set.contains(key)) {
            log.debug("🛑 Exportación duplicada detectada y omitida para key={}", key);
            return;
        }
        set.add(key);

        // Registrar limpieza al finalizar la transacción para evitar fuga de ThreadLocal
        registerCleanupIfNeeded();

        log.info("🔄 Exportando cambio de entidad {} acción {}", action, entity);
        try {
            SyncEventDTO dto = new SyncEventDTO();
            dto.setOriginNodeId(syncProps.getNodeId());
            dto.setEntityType(entity.getClass().getSimpleName());
            dto.setAction(action);
            dto.setTimestamp(System.currentTimeMillis());
            dto.setContentJson(mapper.writeValueAsString(entity));

            String time = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"));
            String fileName = String.format("%s_%s_%s_%s.json",
                    time, syncProps.getNodeId(), dto.getEntityType(), UUID.randomUUID().toString().substring(0, 8));

            File file = new File(syncProps.getFolderPath(), fileName);
            if (file.getParentFile() != null) file.getParentFile().mkdirs();

            mapper.writeValue(file, dto);
            log.info("📤 Sincronización enviada: {}", fileName);

        } catch (Exception e) {
            log.error("❌ Error exportando a OneDrive", e);
        }
    }

    private static String extractId(Object entity) {
        try {
            Method getId = entity.getClass().getMethod("getId");
            Object id = getId.invoke(entity);
            if (id != null) return String.valueOf(id);
        } catch (NoSuchMethodException ignored) {
        } catch (Exception e) {
            log.debug("No se pudo extraer id de la entidad: {}", e.toString());
        }
        return "NOID@" + System.identityHashCode(entity);
    }

    private static void registerCleanupIfNeeded() {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            // registrar sincronización una sola vez por transacción/hilo
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    exportedKeys.remove();
                }
            });
        } else {
            // si no hay transacción, limpiar inmediatamente después del uso para evitar acumular
            exportedKeys.remove();
        }
    }

    private static SyncProperties getSyncProperties() {
        if (props != null) return props;
        try {
            BeanUtil bu = BeanUtil.getBean(BeanUtil.class);
            SyncProperties p = BeanUtil.getBean(SyncProperties.class);
            props = p;
            return p;
        } catch (Exception e) {
            log.debug("SyncProperties no disponible desde BeanUtil (posible orden de inicialización): {}", e.toString());
            return null;
        }
    }
}
