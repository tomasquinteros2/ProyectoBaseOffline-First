package micro.microservicio_proveedor.sync;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import micro.microservicio_proveedor.entities.Proveedor;
import micro.microservicio_proveedor.repositories.ProveedorRepository;
import micro.microservicio_proveedor.sync.initial.InitialSnapshotService;
import org.springframework.beans.BeanWrapper;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;

import java.io.File;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

// @Service
@RequiredArgsConstructor
@Slf4j
public class SyncService {

    private final SyncProperties syncProps;
    private final List<SyncableRepository<?,?>> syncRepos;
    private final InitialSnapshotService initialSnapshotService;

    private Map<String, SyncableRepository<?, ?>> repoMap;
    private final ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private final Set<String> processedFilesLog = new HashSet<>();
    private Path processedLogFilePath;


    // @PostConstruct
    public void init() {
        this.repoMap = syncRepos.stream()
                .collect(Collectors.toMap(SyncableRepository::getEntityClassName, Function.identity()));
        try {
            this.processedLogFilePath = Paths.get(syncProps.getFolderPath(),
                    "processed_" + syncProps.getNodeId() + ".log");
            if (Files.exists(processedLogFilePath)) {
                processedFilesLog.addAll(Files.readAllLines(processedLogFilePath));
            }
        } catch (Exception e) {
            log.error("No se pudo cargar el registro de archivos procesados.", e);
        }
    }

    // @Scheduled(fixedDelay = 5000)
    public void processIncomingFiles() {
        if (!initialSnapshotService.isInitialSyncCompleted()) {
            log.debug("⏳ Esperando a que complete el snapshot inicial antes de procesar archivos...");
            return;
        }

        Path folderPath = Paths.get(syncProps.getFolderPath());
        File folder = folderPath.toFile();
        if (!folder.exists() || !folder.isDirectory()) return;

        try {
            File[] jsonFiles = folder.listFiles((dir, name) -> name.toLowerCase().endsWith(".json"));
            if (jsonFiles == null || jsonFiles.length == 0) return;

            List<File> filesToProcess = Arrays.stream(jsonFiles).sorted(Comparator.comparing(File::getName)).collect(Collectors.toList());
            for (File file : filesToProcess) {
                String fileName = file.getName();
                if (fileName.contains("snapshot_full")) continue;
                if (processedFilesLog.contains(fileName)) continue;

                String[] parts = fileName.split("_");
                if (parts.length < 4) continue;
                String originNodeIdFromFile = String.join("_", Arrays.copyOfRange(parts, 1, parts.length - 2));
                if (originNodeIdFromFile.equals(syncProps.getNodeId())) continue;

                processSingleFile(file);
            }
            cleanupOldFiles(folder);
        } catch (Exception e) {
            log.error("Error listando archivos de sincronización en {}", folder, e);
        }
    }

    @Transactional
    protected void processSingleFile(File file) {
        try {
            SyncEventDTO dto = mapper.readValue(file, SyncEventDTO.class);
            SyncableRepository repository = repoMap.get(dto.getEntityType());
            if (repository == null) return;

            SyncContext.setSyncing(true);
            Object entity = mapper.readValue(dto.getContentJson(), repository.getEntityClass());

            if ("SAVE".equals(dto.getAction())) {
                Optional<Object> existing = findExistingEntity(repository, entity);
                if (existing.isPresent()) {
                    Object current = existing.get();
                    copyNonNullProperties(entity, current, "id");
                    repository.save(current);
                } else {
                    try {
                        repository.save(entity);
                    } catch (DataIntegrityViolationException dive) {
                        log.warn("Registro duplicado detectado para {}. Reintentando merge: {}", dto.getEntityType(), dive.getMessage());
                        Optional<Object> conflicted = findExistingEntity(repository, entity);
                        if (conflicted.isPresent()) {
                            Object current = conflicted.get();
                            copyNonNullProperties(entity, current, "id");
                            repository.save(current);
                        } else {
                            throw dive;
                        }
                    }
                }
            } else if ("DELETE".equals(dto.getAction())) {
                Optional<Object> existing = findExistingEntity(repository, entity);
                if (existing.isPresent()) {
                    repository.delete(existing.get());
                } else {
                    repository.delete(entity);
                }
            } else {
                log.warn("Acción desconocida '{}' en el evento.", dto.getAction());
            }

            markFileAsProcessed(file.getName());
        } catch (Exception e) {
            log.error("❌ Fallo procesando archivo {}. No se marcará como procesado y se reintentará.", file.getName(), e);
        } finally {
            SyncContext.setSyncing(false);
        }
    }

    private Optional<Object> findExistingEntity(SyncableRepository<?, ?> repo, Object entity) {
        if (repo instanceof ProveedorRepository proveedorRepository && entity instanceof Proveedor proveedor) {
            String nombre = proveedor.getNombre();
            if (nombre != null && !nombre.isBlank()) {
                return proveedorRepository.findByNombreIgnoreCase(nombre.trim())
                        .map(found -> (Object) found);
            }
        }
        try {
            // 1) Si tiene id, intentar encontrar por cualquier findById que exista en el repo
            try {
                Method getId = entity.getClass().getMethod("getId");
                Object id = getId.invoke(entity);
                if (id != null) {
                    for (Method m : repo.getClass().getMethods()) {
                        if (!m.getName().equals("findById")) continue;
                        if (m.getParameterCount() != 1) continue;
                        try {
                            Object res = m.invoke(repo, convertArg(id, m.getParameterTypes()[0]));
                            if (res instanceof Optional) return (Optional<Object>) res;
                            if (res != null) return Optional.of(res);
                        } catch (Exception ex) {
                            log.debug("No se pudo invocar findById en repo: {}", ex.toString());
                        }
                    }
                }
            } catch (NoSuchMethodException ignored) { }

            // 2) Intentar por campos naturales comunes; probar variantes ignoreCase y normalizar strings
            String[] candidates = {"nombre", "name", "username"};
            BeanWrapper bw = new BeanWrapperImpl(entity);
            for (String prop : candidates) {
                if (!bw.isReadableProperty(prop)) continue;
                Object val = bw.getPropertyValue(prop);
                if (val == null) continue;

                Object normVal = normalizeForFinder(val);

                // posibles finders: exacto y ignoreCase
                List<String> finderNames = new ArrayList<>();
                String baseFinder = "findBy" + Character.toUpperCase(prop.charAt(0)) + prop.substring(1);
                finderNames.add(baseFinder + "IgnoreCase");
                finderNames.add(baseFinder);

                for (String finder : finderNames) {
                    for (Method m : repo.getClass().getMethods()) {
                        if (!m.getName().equals(finder)) continue;
                        if (m.getParameterCount() != 1) continue;
                        try {
                            Object arg = convertArg(normVal, m.getParameterTypes()[0]);
                            Object res = m.invoke(repo, arg);
                            if (res == null) continue;
                            if (res instanceof Optional) return (Optional<Object>) res;
                            return Optional.of(res);
                        } catch (Exception ex) {
                            log.debug("No se pudo invocar {} en repo: {}", finder, ex.toString());
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Error buscando entidad existente: {}", e.toString());
        }
        return Optional.empty();
    }
    private Object normalizeForFinder(Object val) {
        if (val instanceof String s) {
            return s.trim().toLowerCase();
        }
        return val;
    }
    private Object convertArg(Object value, Class<?> paramType) {
        if (value == null) return null;
        if (paramType.isAssignableFrom(value.getClass())) {
            return value;
        }
        if (paramType == String.class) {
            return value.toString();
        }
        if (Number.class.isAssignableFrom(paramType) || paramType.isPrimitive()) {
            String s = value.toString();
            try {
                if (paramType == Long.class || paramType == long.class) return Long.parseLong(s);
                if (paramType == Integer.class || paramType == int.class) return Integer.parseInt(s);
                if (paramType == Short.class || paramType == short.class) return Short.parseShort(s);
                if (paramType == Byte.class || paramType == byte.class) return Byte.parseByte(s);
                if (paramType == Double.class || paramType == double.class) return Double.parseDouble(s);
                if (paramType == Float.class || paramType == float.class) return Float.parseFloat(s);
            } catch (NumberFormatException ignored) { }
        }
        return value;
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

    private void markFileAsProcessed(String fileName) {
        try {
            Files.writeString(processedLogFilePath, fileName + System.lineSeparator(), StandardOpenOption.CREATE, StandardOpenOption.APPEND);
            processedFilesLog.add(fileName);
            log.info("📝 Archivo {} registrado como procesado.", fileName);
        } catch (Exception e) {
            log.error("No se pudo escribir en el registro de archivos procesados.", e);
        }
    }

    private void cleanupOldFiles(File folder) {
        try {
            long cutoff = LocalDateTime.now().minusDays(14).toInstant(ZoneOffset.UTC).toEpochMilli();
            File[] oldFiles = folder.listFiles(f -> f.getName().endsWith(".json") && f.lastModified() < cutoff);
            if (oldFiles != null) {
                for (File oldFile : oldFiles) {
                    oldFile.delete();
                }
            }
        } catch (Exception e) {
            log.error("Error durante la limpieza de archivos antiguos.", e);
        }
    }
}
