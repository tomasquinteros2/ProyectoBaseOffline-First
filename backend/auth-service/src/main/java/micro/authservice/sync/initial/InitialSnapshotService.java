package micro.authservice.sync.initial;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import micro.authservice.entity.Authority;
import micro.authservice.entity.Usuario;
import micro.authservice.repository.AuthorityRepository;
import micro.authservice.repository.UsuarioRepository;
import micro.authservice.sync.SyncContext;
import micro.authservice.sync.SyncProperties;
import micro.authservice.sync.SyncableRepository;
import micro.authservice.sync.UsuarioSyncDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final AuthorityRepository authorityRepository;
    private final UsuarioRepository usuarioRepository;

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
                List<?> serialized = repo.findAll().stream()
                        .map(this::serializeEntityForSnapshot)
                        .collect(Collectors.toList());
                payload.put(repo.getEntityClassName(), serialized);
            }
            Files.writeString(
                    snapshotFile.toPath(),
                    mapper.writerWithDefaultPrettyPrinter().writeValueAsString(payload),
                    StandardOpenOption.CREATE,
                    StandardOpenOption.TRUNCATE_EXISTING
            );
            log.info("📦 Snapshot completo generado en {}", snapshotFile.getAbsolutePath());
        } catch (Exception e) {
            log.error("No se pudo exportar el snapshot completo", e);
        }
    }

    @Transactional
    @SuppressWarnings({"unchecked", "rawtypes"})
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
            File[] allSnapshots = folder.listFiles((dir, name) -> name.startsWith("snapshot_full_") && name.endsWith(".json"));

            if (allSnapshots == null || allSnapshots.length == 0) {
                log.info("ℹ️ No se encontraron archivos que comiencen con 'snapshot_full_' en {}", folder.getAbsolutePath());
                markInitialSyncCompleted();
                return;
            }

            log.info("ℹ️ Snapshots detectados: {}", Arrays.stream(allSnapshots)
                    .map(File::getName)
                    .reduce((a, b) -> a + ", " + b)
                    .orElse(""));

            Optional<File> latestFromSameAppOtherNode = Arrays.stream(allSnapshots)
                    .filter(f -> f.getName().startsWith(exactPrefix))
                    .filter(f -> !f.getName().contains(syncProps.getNodeId()))
                    .max(Comparator.comparingLong(File::lastModified));

            if (latestFromSameAppOtherNode.isEmpty()) {
                log.info("ℹ️ No hay snapshots de la misma aplicación generados por otros nodos. No se importará ninguno.");
                markInitialSyncCompleted();
                return;
            }

            File toImport = latestFromSameAppOtherNode.get();
            log.info("🔁 Importando snapshot inicial desde {} (lastModified={})", toImport.getName(), toImport.lastModified());

            Map<String, List<?>> rawPayload = mapper.readValue(toImport, Map.class);

            for (SyncableRepository<?, ?> repo : syncRepos) {
                List<?> rawList = rawPayload.get(repo.getEntityClassName());
                if (rawList == null || rawList.isEmpty()) continue;

                try {
                    SyncContext.setSyncing(true);

                    if ("Usuario".equals(repo.getEntityClassName())) {
                        List<Usuario> usuarios = ((List<Map<String, Object>>) rawList).stream()
                                .map(this::convertUsuarioSnapshotEntry)
                                .collect(Collectors.toList());

                        // Guardar uno a uno para asegurar que JPA actualiza la tabla join
                        SyncableRepository<Usuario, ?> userRepo = (SyncableRepository<Usuario, ?>) repo;
                        for (Usuario u : usuarios) {
                            // normalizar username
                            if (u.getUsername() != null) {
                                u.setUsername(u.getUsername().toLowerCase());
                            }

                            // asegurar autoridades gestionadas
                            Set<Authority> managed = u.getAuthorities().stream()
                                    .map(a -> authorityRepository.findByName(a.getName())
                                            .orElseGet(() -> authorityRepository.save(new Authority(a.getName()))))
                                    .collect(Collectors.toCollection(HashSet::new));
                            u.setAuthorities(managed);

                            // BUSCAR por username para evitar duplicate key
                            Optional<Usuario> existingOpt = usuarioRepository.findByUsername(u.getUsername());
                            if (existingOpt.isPresent()) {
                                Usuario existing = existingOpt.get();
                                // hacer merge: conservar id y reemplazar campos del snapshot (hash incluido)
                                existing.setPassword(u.getPassword());
                                existing.setTotpSecret(u.getTotpSecret());
                                existing.setTwoFactorEnabled(u.isTwoFactorEnabled());
                                existing.setAccountVerified(u.isAccountVerified());
                                existing.setSkipPasswordEncoding(true); // asegurar que no se re-hashee
                                existing.getAuthorities().clear();
                                existing.getAuthorities().addAll(managed);
                                userRepo.save(existing);
                            } else {
                                // nuevo usuario: persistir tal cual
                                u.setSkipPasswordEncoding(true);
                                userRepo.save(u);
                            }
                        }

                        log.info("✅ Importadas {} entidades de tipo {}", usuarios.size(), repo.getEntityClassName());
                        markInitialSyncCompleted();
                        continue;
                    }

                    Class<?> entityClass = repo.getEntityClass();
                    List<?> converted = mapper.convertValue(
                            rawList,
                            mapper.getTypeFactory().constructCollectionType(List.class, entityClass)
                    );
                    ((SyncableRepository) repo).saveAll(converted);
                    log.info("✅ Importadas {} entidades de tipo {}", converted.size(), repo.getEntityClassName());
                } finally {
                    SyncContext.setSyncing(false);
                }
            }

            log.info("✅ Snapshot inicial aplicado exitosamente desde {}", toImport.getName());
        } catch (Exception e) {
            log.error("Error aplicando snapshot inicial", e);
        } finally {
            SyncContext.setSyncing(false);
        }
    }

    // helper para evitar líneas largas
    private File latestFromSameOtherNode(Optional<File> optional) {
        return optional.get();
    }

    private Object serializeEntityForSnapshot(Object entity) {
        if (entity instanceof Usuario usuario) {
            UsuarioSyncDTO dto = new UsuarioSyncDTO();
            dto.setId(usuario.getId());
            dto.setUsername(usuario.getUsername());
            dto.setPassword(usuario.getPassword());
            dto.setTotpSecret(usuario.getTotpSecret());
            dto.setTwoFactorEnabled(usuario.isTwoFactorEnabled());
            dto.setAccountVerified(usuario.isAccountVerified());
            dto.setAuthorities(usuario.getAuthorities().stream()
                    .map(Authority::getName)
                    .collect(Collectors.toSet()));
            return dto;
        }
        Map<String, Object> map = mapper.convertValue(entity, Map.class);
        try {
            Method getter = entity.getClass().getMethod("getPassword");
            Object value = getter.invoke(entity);
            if (value != null) {
                map.put("password", value);
            }
        } catch (NoSuchMethodException ignored) {
        } catch (Exception e) {
            log.warn("⚠️ No se pudo incluir el password en snapshot para {}: {}", entity, e.toString());
        }
        return map;
    }

    private Usuario convertUsuarioSnapshotEntry(Map<String, Object> entry) {
        UsuarioSyncDTO dto = mapper.convertValue(entry, UsuarioSyncDTO.class);

        Usuario usuario = new Usuario();
        usuario.setId(dto.getId());
        usuario.setUsername(dto.getUsername() != null ? dto.getUsername().toLowerCase() : null);
        usuario.setPassword(dto.getPassword());
        usuario.setTotpSecret(dto.getTotpSecret());
        usuario.setTwoFactorEnabled(dto.isTwoFactorEnabled());
        usuario.setAccountVerified(dto.isAccountVerified());
        usuario.setSkipPasswordEncoding(true);

        Set<Authority> authorities = resolveAuthorities(dto.getAuthorities());
        usuario.setAuthorities(authorities);

        if (usuario.getPassword() == null || usuario.getPassword().isBlank()) {
            log.warn("⚠️ Snapshot de usuario {} no contenía password. Validación podría fallar.", usuario.getUsername());
        }
        return usuario;
    }

    private Set<Authority> resolveAuthorities(Set<String> names) {
        if (names == null || names.isEmpty()) {
            return Collections.emptySet();
        }
        return names.stream()
                .map(name -> authorityRepository.findByName(name)
                        .orElseGet(() -> authorityRepository.save(new Authority(name))))
                .collect(Collectors.toCollection(HashSet::new));
    }
}
