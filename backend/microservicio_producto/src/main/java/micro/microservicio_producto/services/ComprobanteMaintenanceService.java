package micro.microservicio_producto.services;

import jakarta.transaction.Transactional;
import micro.microservicio_producto.repositories.ComprobanteRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;

@Service
@EnableScheduling
public class ComprobanteMaintenanceService {

    private final ComprobanteRepository comprobanteRepository;
    private final Logger log = LoggerFactory.getLogger(ComprobanteMaintenanceService.class);

    @Value("${app.storage.local}")
    private String rutaLocal;

    @Value("${app.storage.backup}")
    private String rutaBackup;

    public ComprobanteMaintenanceService(ComprobanteRepository comprobanteRepository) {
        this.comprobanteRepository = comprobanteRepository;
    }

    @Transactional
    @Scheduled(cron = "${comprobante.cleanup.cron:0 0 20 * * ?}")
    public void rotarComprobantesAntiguos() {
        LocalDateTime fechaLimite = LocalDateTime.now().minusDays(90);
        log.info("Ejecutando rotación automática de comprobantes. Fecha límite: {}", fechaLimite);

        moverArchivosLocalesAntiguos(fechaLimite);

        int deletedCount = comprobanteRepository.deleteByFechaGeneracionBefore(fechaLimite);
        log.info("{} registros de comprobantes antiguos eliminados de la base de datos.", deletedCount);
    }

    private void moverArchivosLocalesAntiguos(LocalDateTime fechaLimite) {
        try {
            log.info("--- Iniciando rotación de archivos locales ---");
            Path directorioOrigen = Paths.get(rutaLocal);
            Path directorioDestino = Paths.get(rutaBackup);

            if (!Files.exists(directorioOrigen)) {
                log.warn("El directorio de origen '{}' no existe. No hay archivos para rotar.", directorioOrigen.toAbsolutePath());
                return;
            }

            if (!Files.exists(directorioDestino)) {
                log.info("Creando directorio de backup: {}", directorioDestino.toAbsolutePath());
                Files.createDirectories(directorioDestino);
            }

            List<Path> archivosMovidos = Files.list(directorioOrigen)
                    .filter(Files::isRegularFile)
                    .filter(path -> {
                        try {
                            return getLastModifiedTime(path).isBefore(fechaLimite);
                        } catch (IOException e) {
                            log.error("Error al verificar la fecha del archivo: {}", path, e);
                            return false;
                        }
                    })
                    .map(path -> {
                        try {
                            Path destino = directorioDestino.resolve(path.getFileName());
                            Files.move(path, destino, StandardCopyOption.REPLACE_EXISTING);
                            log.info("Archivo movido exitosamente: {} -> {}", path.getFileName(), destino);
                            return path;
                        } catch (IOException e) {
                            log.error("Error al mover el archivo: {}", path, e);
                            return null;
                        }
                    })
                    .filter(Objects::nonNull)
                    .toList();

            log.info("--- Rotación de archivos finalizada. {} archivos movidos. ---", archivosMovidos.size());

        } catch (IOException e) {
            log.error("Error crítico durante el proceso de rotación de archivos.", e);
        }
    }

    private LocalDateTime getLastModifiedTime(Path path) throws IOException {
        return Files.getLastModifiedTime(path)
                .toInstant()
                .atZone(ZoneId.systemDefault())
                .toLocalDateTime();
    }
}