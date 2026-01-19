package micro.authservice.sync;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.persistence.PostPersist;
import jakarta.persistence.PostRemove;
import jakarta.persistence.PostUpdate;
import lombok.extern.slf4j.Slf4j;
import micro.authservice.entity.Authority;
import micro.authservice.entity.Usuario;
import org.springframework.stereotype.Component;

import java.io.File;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

// @Component
@Slf4j
public class OneDriveListener {

    private final ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final SyncProperties syncProps;

    private static final ThreadLocal<Set<String>> exportedKeys = ThreadLocal.withInitial(HashSet::new);

    public OneDriveListener(SyncProperties syncProps) {
        this.syncProps = syncProps;
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

    public void exportChange(Object entity, String action) {
        if (SyncContext.isSyncing()) return;
        log.info("🔄 Exportando cambio de entidad {} acción {}", action, entity);

        try {
            Object content;
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
                content = dto;
            } else {
                content = entity;
            }
            SyncEventDTO dto = new SyncEventDTO();
            dto.setOriginNodeId(syncProps.getNodeId());
            dto.setEntityType(entity.getClass().getSimpleName());
            dto.setAction(action);
            dto.setTimestamp(System.currentTimeMillis());
            dto.setContentJson(mapper.writeValueAsString(content));
            String time = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"));
            String fileName = String.format(
                    "%s_%s_%s_%s.json",
                    time, syncProps.getNodeId(), dto.getEntityType(), UUID.randomUUID().toString().substring(0, 8)
            );

            File file = new File(syncProps.getFolderPath(), fileName);
            file.getParentFile().mkdirs();

            mapper.writeValue(file, dto);
            log.info("📤 Sincronización enviada: {}", fileName);
        } catch (Exception e) {
            log.error("❌ Error exportando a OneDrive", e);
        }
    }
}
