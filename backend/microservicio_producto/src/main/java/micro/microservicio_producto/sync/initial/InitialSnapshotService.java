package micro.microservicio_producto.sync.initial;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import micro.microservicio_producto.sync.SyncContext;
import micro.microservicio_producto.sync.SyncProperties;
import micro.microservicio_producto.sync.SyncableRepository;
import org.springframework.beans.BeanWrapper;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.StandardOpenOption;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

// @Service
@RequiredArgsConstructor
@Slf4j
public class InitialSnapshotService {

    private final List<SyncableRepository<?, ?>> syncRepos;
    private final SyncProperties syncProps;

    @Value("${spring.application.name:application}")
    private String appName;

    private final ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private File snapshotFile;

    // @PostConstruct
    void init() {
        String fileName = String.format("snapshot_full_%s_%s.json", appName, syncProps.getNodeId());
        snapshotFile = new File(syncProps.getFolderPath(), fileName);
    }

    @Getter
    private final AtomicBoolean initialSyncCompleted = new AtomicBoolean(false);

    public boolean isInitialSyncCompleted() {
        return initialSyncCompleted.get();
    }

    public void markInitialSyncCompleted() {
        initialSyncCompleted.set(true);
        log.info("✅ Initial sync marcado como completado. SyncService puede procesar archivos.");
    }
    @Transactional(readOnly = true)
    public void exportFullSnapshot() {
        try {
            Map<String, Object> payload = new HashMap<>();
            for (SyncableRepository<?, ?> repo : syncRepos) {
                payload.put(repo.getEntityClassName(), repo.findAll());
            }
            Files.writeString(snapshotFile.toPath(),
                    mapper.writerWithDefaultPrettyPrinter().writeValueAsString(payload),
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            log.info("📦 Snapshot completo generado en {}", snapshotFile.getAbsolutePath());
        } catch (Exception e) {
            log.error("No se pudo exportar el snapshot completo", e);
        }
    }

    @Transactional
    public void importFullSnapshotIfNeeded() {
        File folder = new File(syncProps.getFolderPath());
        if (!folder.exists() || !folder.isDirectory()) {
            log.info("ℹ️ Carpeta de sincronización no existe o no es directorio: {}", syncProps.getFolderPath());
            return;
        }

        log.info("ℹ️ importFullSnapshotIfNeeded - folder={}, appName={}, nodeId={}",
                syncProps.getFolderPath(), appName, syncProps.getNodeId());

        try {
            final String exactPrefix = "snapshot_full_" + appName + "_";
            // Lista todos los archivos de snapshot para diagnóstico
            File[] allSnapshots = folder.listFiles((dir, name) -> name.startsWith("snapshot_full_") && name.endsWith(".json"));

            if (allSnapshots == null || allSnapshots.length == 0) {
                log.info("ℹ️ No se encontraron archivos que comiencen con 'snapshot_full_' en {}", folder.getAbsolutePath());
                markInitialSyncCompleted();
                return;
            }

            log.info("ℹ️ Snapshots detectados: {}", Arrays.stream(allSnapshots).map(File::getName).reduce((a,b)->a+", "+b).orElse(""));

            // 1) Preferir snapshots del mismo appName (pero no el propio nodo)
            Optional<File> latestFromSameApp = Arrays.stream(allSnapshots)
                    .filter(f -> f.getName().startsWith(exactPrefix))
                    .filter(f -> !f.getName().contains(syncProps.getNodeId()))
                    .max((a, b) -> Long.compare(a.lastModified(), b.lastModified()));

            // 2) Si no hay del mismo appName (o no hay de otros nodos), elegir el snapshot más reciente de otro nodo cualquiera
            Optional<File> latestFromOtherAnyApp = Arrays.stream(allSnapshots)
                    .filter(f -> !f.getName().contains(syncProps.getNodeId()))
                    .max((a, b) -> Long.compare(a.lastModified(), b.lastModified()));

            File toImport = latestFromSameApp.orElse(latestFromOtherAnyApp.orElse(null));

            if (toImport == null) {
                log.info("ℹ️ Los únicos snapshots presentes pertenecen a este mismo nodo (no se importará).");
                markInitialSyncCompleted();
                return;
            }

            log.info("🔁 Importando snapshot inicial desde {} (lastModified={})", toImport.getName(), toImport.lastModified());

            Map<String, List<?>> rawPayload = mapper.readValue(toImport, Map.class);


            for (SyncableRepository<?, ?> repo : syncRepos) {
                List<?> rawList = rawPayload.get(repo.getEntityClassName());
                if (rawList == null || rawList.isEmpty()) continue;

                try {
                    SyncContext.setSyncing(true);

                    // convertir a la clase de entidad
                    Class<?> entityClass = repo.getEntityClass();
                    List<?> converted = mapper.convertValue(rawList, mapper.getTypeFactory().constructCollectionType(List.class, entityClass));

                    // Guardar uno a uno aplicando lógica de merge para prevenir duplicados
                    for (Object e : converted) {
                        try {
                            Optional<Object> existing = findExistingEntity(repo, e);
                            if (existing.isPresent()) {
                                Object current = existing.get();
                                copyNonNullProperties(e, current, "id");
                                ((SyncableRepository) repo).save(current);
                            } else {
                                try {
                                    ((SyncableRepository) repo).save(e);
                                } catch (DataIntegrityViolationException dive) {
                                    // Si falla por key-duplicate, intentar resolver encontrando la entidad y hacer merge
                                    log.warn("Conflicto al insertar entidad (posible duplicado). Intentando merge: {}", dive.getMessage());
                                    Optional<Object> existingAfterError = findExistingEntity(repo, e);
                                    if (existingAfterError.isPresent()) {
                                        Object current = existingAfterError.get();
                                        copyNonNullProperties(e, current, "id");
                                        ((SyncableRepository) repo).save(current);
                                    } else {
                                        // no se encontró; relanzar para que se registre el error
                                        throw dive;
                                    }
                                }
                            }
                        } catch (Exception ex) {
                            log.warn("Error guardando entidad durante import: {}", ex.toString());
                        }
                    }

                    log.info("✅ Importadas {} entidades de tipo {}", converted.size(), repo.getEntityClassName());
                    markInitialSyncCompleted();
                } finally {
                    SyncContext.setSyncing(false);
                }
            }

            log.info("✅ Snapshot inicial aplicado desde {}", toImport.getName());
        } catch (Exception e) {
            log.error("Error aplicando snapshot inicial", e);
        } finally {
            SyncContext.setSyncing(false);
        }
    }

    private Optional<Object> findExistingEntity(SyncableRepository<?, ?> repo, Object entity) {
        try {
            // 1) Si tiene id, intentar encontrar por id (si el repo expone findById)
            try {
                Method getId = entity.getClass().getMethod("getId");
                Object id = getId.invoke(entity);
                if (id != null) {
                    try {
                        Method findById = repo.getClass().getMethod("findById", Object.class);
                        Object res = findById.invoke(repo, id);
                        if (res instanceof Optional) return (Optional<Object>) res;
                    } catch (NoSuchMethodException ignored) {
                        // repo no expone findById con Object (seguimos)
                    }
                }
            } catch (NoSuchMethodException ignored) {
            }

            // 2) Intentar por campos naturales comunes; si el repo tiene método findByXxx lo invocamos
            String[] candidates = {"nombre", "name", "username"};
            BeanWrapper bw = new BeanWrapperImpl(entity);
            for (String prop : candidates) {
                if (!bw.isReadableProperty(prop)) continue;
                Object val = bw.getPropertyValue(prop);
                if (val == null) continue;
                String finder = "findBy" + Character.toUpperCase(prop.charAt(0)) + prop.substring(1);
                // buscar método en repo
                for (Method m : repo.getClass().getMethods()) {
                    if (!m.getName().equals(finder)) continue;
                    try {
                        Object res = m.invoke(repo, val);
                        if (res == null) continue;
                        if (res instanceof Optional) return (Optional<Object>) res;
                        return Optional.of(res);
                    } catch (Exception ex) {
                        log.debug("No se pudo invocar {} en repo: {}", finder, ex.toString());
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Error buscando entidad existente: {}", e.toString());
        }
        return Optional.empty();
    }

    private void copyNonNullProperties(Object src, Object target, String... ignoreProperties) {
        BeanWrapper srcBw = new BeanWrapperImpl(src);
        BeanWrapper trgBw = new BeanWrapperImpl(target);
        Set<String> ignores = new HashSet<>(Arrays.asList(ignoreProperties));
        for (java.beans.PropertyDescriptor pd : srcBw.getPropertyDescriptors()) {
            String name = pd.getName();
            if ("class".equals(name) || ignores.contains(name)) continue;
            Object val = srcBw.getPropertyValue(name);
            if (val != null && trgBw.isWritableProperty(name)) {
                trgBw.setPropertyValue(name, val);
            }
        }
    }
}
