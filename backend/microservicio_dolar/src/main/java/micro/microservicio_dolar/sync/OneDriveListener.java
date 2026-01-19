package micro.microservicio_dolar.sync;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.persistence.PostPersist;
import jakarta.persistence.PostRemove;
import jakarta.persistence.PostUpdate;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import micro.microservicio_dolar.sync.SyncContext;
import micro.microservicio_dolar.sync.SyncProperties;
import org.springframework.stereotype.Component;

import java.io.File;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Component
@NoArgsConstructor
@Slf4j
public class OneDriveListener {

    private static final ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private static SyncProperties props;

    @PostPersist
    @PostUpdate
    public void onSave(Object entity) {
        exportChange(entity, "SAVE");
    }

    @PostRemove
    public void onDelete(Object entity) {
        exportChange(entity, "DELETE");
    }

    public static void exportChange(Object entity, String action) {
        // 1. Si esto viene de una sincronización, NO exportar de nuevo (evitar bucle)
        if (SyncContext.isSyncing())return;
        log.info("🔄 Exportando cambio de entidad {} acción {}", action, entity);
        SyncProperties syncProps = getSyncProperties();

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
            file.getParentFile().mkdirs();

            mapper.writeValue(file, dto);
            log.info("📤 Sincronización enviada: {}", fileName);

        } catch (Exception e) {
            log.error("❌ Error exportando a OneDrive", e);
        }
    }

    private static SyncProperties getSyncProperties() {
        if (props == null) {
            props = BeanUtil.getBean(SyncProperties.class);
        }
        return props;
    }
}