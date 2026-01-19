package micro.authservice.sync;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.UUID;

@Component
@Getter
@Setter
@Slf4j
public class SyncProperties {

    @Value("${app.sync.folder-path}")
    private String folderPath;

    private String nodeId;

    // Inyectamos el valor, pero permitimos lógica adicional
    public SyncProperties(@Value("${app.sync.node-id:AUTO}") String configuredNodeId) {
        if ("AUTO".equals(configuredNodeId) || configuredNodeId == null || configuredNodeId.isEmpty()) {
            this.nodeId = resolveSharedNodeId();
        } else {
            this.nodeId = configuredNodeId;
        }
    }

    private String resolveSharedNodeId() {
        // Usamos una ruta interna compartida por todos los contenedores de esta PC
        Path configDir = Paths.get("/app/config");
        Path idFile = configDir.resolve("node-id.txt");

        try {
            if (!Files.exists(configDir)) {
                Files.createDirectories(configDir);
            }

            // 1. Intentar leer si ya existe
            if (Files.exists(idFile)) {
                String content = Files.readString(idFile).trim();
                if (!content.isEmpty()) {
                    log.info("🆔 Identidad de nodo cargada: {}", content);
                    return content;
                }
            }

            // 2. Generar nuevo ID si no existe
            // Usamos un prefijo NODE_ y parte de un UUID para que sea corto pero único
            String newId = "NODE_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

            // 3. Guardar (con manejo básico de concurrencia por si varios servicios arrancan a la vez)
            try {
                Files.writeString(idFile, newId, StandardOpenOption.CREATE_NEW);
                log.info("🆔 Nueva identidad de nodo generada y guardada: {}", newId);
                return newId;
            } catch (java.nio.file.FileAlreadyExistsException e) {
                // Si otro servicio ganó la carrera y creó el archivo, lo leemos
                return Files.readString(idFile).trim();
            }

        } catch (Exception e) {
            log.error("❌ Error gestionando la identidad del nodo. Usando fallback temporal.", e);
            return "FALLBACK_" + UUID.randomUUID().toString().substring(0, 8);
        }
    }
}
