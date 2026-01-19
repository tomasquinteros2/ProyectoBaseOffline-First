package micro.microservicio_proveedor.sync.initial;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import micro.microservicio_proveedor.entities.Proveedor;
import micro.microservicio_proveedor.entities.RazonSocial;
import micro.microservicio_proveedor.repositories.ProveedorRepository;
import micro.microservicio_proveedor.sync.SyncContext;
import micro.microservicio_proveedor.sync.SyncProperties;
import micro.microservicio_proveedor.sync.SyncableRepository;
import org.springframework.beans.BeanWrapper;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.File;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.StandardOpenOption;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

// @Service
@RequiredArgsConstructor
@Slf4j
public class InitialSnapshotService {

    private final List<SyncableRepository<?, ?>> syncRepos;
    private final SyncProperties syncProps;
    private final PlatformTransactionManager transactionManager;

    private final ProveedorRepository proveedorRepository;

    @Value("${spring.application.name:application}")
    private String appName;

    private final ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private File snapshotFile;
    private TransactionTemplate txTemplate;


    @Getter
    private final AtomicBoolean initialSyncCompleted = new AtomicBoolean(false);

    // @PostConstruct
    void init() {
        String fileName = String.format("snapshot_full_%s_%s.json", appName, syncProps.getNodeId());
        snapshotFile = new File(syncProps.getFolderPath(), fileName);
        txTemplate = new TransactionTemplate(transactionManager);
    }

    public boolean isInitialSyncCompleted() {
        return initialSyncCompleted.get();
    }

    public void markInitialSyncCompleted() {
        initialSyncCompleted.set(true);
        log.info("✅ Initial sync marcado como completado. SyncService puede procesar archivos.");
    }

    public void exportFullSnapshot() {
        txTemplate.executeWithoutResult(status -> {
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
        });
    }

    public void importFullSnapshotIfNeeded() {
        File folder = new File(syncProps.getFolderPath());
        if (!folder.exists() || !folder.isDirectory()) return;

        try {
            final String exactPrefix = "snapshot_full_" + appName + "_";
            File[] allSnapshots = folder.listFiles((dir, name) ->
                    name.startsWith("snapshot_full_") && name.endsWith(".json"));

            if (allSnapshots == null || allSnapshots.length == 0){
                markInitialSyncCompleted();
                return;
            }

            Optional<File> latestFromSameApp = Arrays.stream(allSnapshots)
                    .filter(f -> f.getName().startsWith(exactPrefix))
                    .filter(f -> !f.getName().contains(syncProps.getNodeId()))
                    .max(Comparator.comparingLong(File::lastModified));

            Optional<File> latestFromOtherAnyApp = Arrays.stream(allSnapshots)
                    .filter(f -> !f.getName().contains(syncProps.getNodeId()))
                    .max(Comparator.comparingLong(File::lastModified));

            File toImport = latestFromSameApp.orElse(latestFromOtherAnyApp.orElse(null));
            if (toImport == null){
                markInitialSyncCompleted();
                return;
            }

            log.info("🔁 Importando snapshot desde {}", toImport.getName());
            Map<String, List<?>> rawPayload = mapper.readValue(toImport, Map.class);

            for (SyncableRepository<?, ?> repo : syncRepos) {
                List<?> rawList = rawPayload.get(repo.getEntityClassName());
                if (rawList == null || rawList.isEmpty()) continue;

                Class<?> entityClass = repo.getEntityClass();
                List<?> converted = mapper.convertValue(rawList,
                        mapper.getTypeFactory().constructCollectionType(List.class, entityClass));

                int imported = 0;
                for (Object entity : converted) {
                    boolean success = importSingleEntity(repo, entity);
                    if (success) imported++;
                }
                log.info("✅ Importadas {}/{} entidades de {}", imported, converted.size(), repo.getEntityClassName());
                markInitialSyncCompleted();
            }
        } catch (Exception e) {
            log.error("Error aplicando snapshot inicial", e);
        }
    }
    private boolean importSingleEntity(SyncableRepository<?, ?> repo, Object entity) {
        try {
            return Boolean.TRUE.equals(txTemplate.execute(status -> {
                try {
                    SyncContext.setSyncing(true);
                    Optional<Object> existing = findExistingEntity(repo, entity);
                    if (existing.isPresent()) {
                        Object current = existing.get();
                        copyNonNullProperties(entity, current, "id");
                        ((SyncableRepository) repo).save(current);
                    } else {
                        ((SyncableRepository) repo).save(entity);
                    }
                    return true;
                } catch (Exception e) {
                    status.setRollbackOnly();
                    log.warn("Error importando entidad: {}", e.getMessage());
                    return false;
                } finally {
                    SyncContext.setSyncing(false);
                }
            }));
        } catch (Exception e) {
            log.warn("Error en transacción: {}", e.getMessage());
            return false;
        }
    }
    private static Object convertArgToParamType(Object value, Class<?> paramType) {
        if (value == null) return null;
        if (paramType.isAssignableFrom(value.getClass())) return value;
        if (paramType == String.class) return value.toString();
        String s = value.toString();
        try {
            if (paramType == Long.class || paramType == long.class) return Long.parseLong(s);
            if (paramType == Integer.class || paramType == int.class) return Integer.parseInt(s);
            if (paramType == Short.class || paramType == short.class) return Short.parseShort(s);
            if (paramType == Byte.class || paramType == byte.class) return Byte.parseByte(s);
            if (paramType == Double.class || paramType == double.class) return Double.parseDouble(s);
            if (paramType == Float.class || paramType == float.class) return Float.parseFloat(s);
        } catch (NumberFormatException ignored) { }
        return value;
    }
    private Long extractIdAsLong(Object entity) {
        try {
            Method getId = entity.getClass().getMethod("getId");
            Object id = getId.invoke(entity);
            if (id == null) return null;
            if (id instanceof Long) return (Long) id;
            return Long.valueOf(id.toString());
        } catch (Exception e) {
            return null;
        }
    }

    private void forceIdBeforeSave(Object entity, Long id) {
        try {
            Method setId = entity.getClass().getMethod("setId", Long.class);
            setId.invoke(entity, id);
        } catch (Exception e) {
            log.debug("No se pudo forzar ID en la entidad: {}", e.toString());
        }
    }

    private void mergeRazonesSociales(Proveedor incoming, Proveedor managed) {
        if (incoming.getRazonesSociales() == null) return;

        Set<RazonSocial> managedSet = managed.getRazonesSociales();
        if (managedSet == null) {
            managedSet = new HashSet<>();
            managed.setRazonesSociales(managedSet);
        }

        Map<Long, RazonSocial> byId = managedSet.stream()
                .filter(r -> r.getId() != null)
                .collect(Collectors.toMap(RazonSocial::getId, r -> r));
        Map<String, RazonSocial> byNombre = managedSet.stream()
                .filter(r -> r.getNombre() != null)
                .collect(Collectors.toMap(r -> r.getNombre().toLowerCase(), r -> r, (a, b) -> a));

        for (RazonSocial incomingRazon : incoming.getRazonesSociales()) {
            incomingRazon.setProveedor(managed);

            RazonSocial existing = null;
            if (incomingRazon.getId() != null) {
                existing = byId.get(incomingRazon.getId());
            }
            if (existing == null && incomingRazon.getNombre() != null) {
                existing = byNombre.get(incomingRazon.getNombre().toLowerCase());
            }

            if (existing != null) {
                copyNonNullProperties(incomingRazon, existing, "id", "proveedor", "cuentasBancarias");
                // hacer merge de cuentas sin reemplazar la colección manejada
                mergeCuentasBancarias(incomingRazon, existing);
            } else {
                if (incomingRazon.getCuentasBancarias() != null) {
                    incomingRazon.getCuentasBancarias().forEach(cb -> cb.setRazonSocial(incomingRazon));
                }
                managedSet.add(incomingRazon);
            }
        }
    }

    private void mergeCuentasBancarias(RazonSocial incoming, RazonSocial managed) {
        if (incoming.getCuentasBancarias() == null) return;

        List<micro.microservicio_proveedor.entities.CuentaBancaria> managedList = managed.getCuentasBancarias();
        if (managedList == null) {
            managedList = new ArrayList<>();
            managed.setCuentasBancarias(managedList);
        }

        Map<Long, micro.microservicio_proveedor.entities.CuentaBancaria> byId = managedList.stream()
                .filter(cb -> cb.getId() != null)
                .collect(Collectors.toMap(cb -> cb.getId(), cb -> cb));
        Map<String, micro.microservicio_proveedor.entities.CuentaBancaria> byNumero = managedList.stream()
                .filter(cb -> cb.getNumeroCuenta() != null)
                .collect(Collectors.toMap(cb -> cb.getNumeroCuenta(), cb -> cb, (a, b) -> a));

        for (micro.microservicio_proveedor.entities.CuentaBancaria incomingCb : incoming.getCuentasBancarias()) {
            incomingCb.setRazonSocial(managed);

            micro.microservicio_proveedor.entities.CuentaBancaria existingCb = null;
            if (incomingCb.getId() != null) {
                existingCb = byId.get(incomingCb.getId());
            }
            if (existingCb == null && incomingCb.getNumeroCuenta() != null) {
                existingCb = byNumero.get(incomingCb.getNumeroCuenta());
            }

            if (existingCb != null) {
                copyNonNullProperties(incomingCb, existingCb, "id", "razonSocial");
                existingCb.setRazonSocial(managed);
            } else {
                incomingCb.setRazonSocial(managed);
                managedList.add(incomingCb);
            }
        }
    }
    private void relinkProveedorReference(Object entity) {
        if (entity instanceof RazonSocial razon && razon.getProveedor() != null) {
            Proveedor proveedorReal = resolveProveedorByNombre(razon.getProveedor().getNombre());
            razon.setProveedor(proveedorReal);
            return;
        }

        if (entity instanceof Proveedor proveedor) {
            Proveedor proveedorReal = resolveProveedorByNombre(proveedor.getNombre());
            if (proveedorReal != null) {
                proveedor.setId(proveedorReal.getId());
            }
            if (proveedor.getRazonesSociales() != null) {
                for (RazonSocial razon : proveedor.getRazonesSociales()) {
                    if (razon != null) {
                        razon.setProveedor(proveedor);
                    }
                }
            }
        }
    }
    private Proveedor resolveProveedorByNombre(String nombre) {
        if (nombre == null || nombre.isBlank()) return null;
        return proveedorRepository.findByNombreIgnoreCase(nombre.trim())
                .orElseThrow(() -> new IllegalStateException("Proveedor inexistente para nombre=" + nombre));
    }

    private Optional<Object> findExistingEntity(SyncableRepository<?, ?> repo, Object entity) {
        // lógica específica para Proveedor: buscar por nombre ignore-case antes de intentar por id
        try {
            if (repo instanceof ProveedorRepository proveedorRepo && entity instanceof Proveedor proveedor) {
                String nombre = proveedor.getNombre();
                if (nombre != null && !nombre.isBlank()) {
                    return proveedorRepo.findByNombreIgnoreCase(nombre.trim()).map(f -> (Object) f);
                }
            }
        } catch (Exception e) {
            log.warn("Error buscando Proveedor por nombre: {}", e.toString());
        }

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
