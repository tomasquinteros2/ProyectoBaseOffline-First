package micro.microservicio_producto.services;

import micro.microservicio_producto.web.dto.SyncStatusDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class SyncStatusService {

    private static final Logger log = LoggerFactory.getLogger(SyncStatusService.class);
    private final JdbcTemplate jdbcTemplate;

    public SyncStatusService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public SyncStatusDTO getStatus() {
        try {
            String checkTableQuery = "SELECT EXISTS (SELECT FROM information_schema.tables " +
                    "WHERE table_schema = 'public' AND table_name = 'sym_outgoing_batch')";

            Boolean tableExists = jdbcTemplate.queryForObject(checkTableQuery, Boolean.class);

            if (tableExists == null || !tableExists) {
                log.warn("Las tablas de SymmetricDS no existen");
                return new SyncStatusDTO(false, null, "SymmetricDS no está configurado", null);
            }

            String queryPendientes = "SELECT COUNT(*) FROM sym_outgoing_batch WHERE status != 'OK'";
            Long registrosPendientes = jdbcTemplate.queryForObject(queryPendientes, Long.class);

            String queryUltima = "SELECT MAX(create_time) FROM sym_outgoing_batch WHERE status = 'OK'";
            LocalDateTime ultimaSincronizacion = jdbcTemplate.queryForObject(queryUltima, LocalDateTime.class);

            String queryActividadReciente = "SELECT COUNT(*) FROM sym_outgoing_batch " +
                    "WHERE create_time > NOW() - INTERVAL '5 minutes'";
            Long actividadReciente = jdbcTemplate.queryForObject(queryActividadReciente, Long.class);

            boolean servicioActivo = actividadReciente != null && actividadReciente > 0;
            boolean sincronizado = registrosPendientes != null && registrosPendientes == 0;

            String mensaje;
            if (!servicioActivo && !sincronizado) {
                mensaje = "SymmetricDS inactivo con " + registrosPendientes + " registros pendientes";
            } else if (!servicioActivo && sincronizado) {
                mensaje = "SymmetricDS inactivo pero sin pendientes (última sync: " + ultimaSincronizacion + ")";
            } else if (servicioActivo && !sincronizado) {
                mensaje = "Hay " + registrosPendientes + " registros pendientes de sincronizar";
            } else {
                mensaje = "Sincronización completa y activa";
            }

            //log.info("Estado: activo={}, sincronizado={}, pendientes={}",
            //        servicioActivo, sincronizado, registrosPendientes);

            return new SyncStatusDTO(sincronizado, ultimaSincronizacion, mensaje, registrosPendientes);

        } catch (Exception e) {
            log.error("Error al verificar estado: {}", e.getMessage(), e);
            return new SyncStatusDTO(false, null, "Error: " + e.getMessage(), null);
        }
    }
}
