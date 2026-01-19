package micro.microservicio_proveedor.sync.initial;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class InitialSnapshotInitializer implements ApplicationListener<ApplicationReadyEvent> {

    private final InitialSnapshotService snapshotService;
    private final Environment environment;

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        // Permitir desactivar la importación por perfil/propiedad si fuese necesario.
        boolean importEnabled = environment.getProperty("app.sync.snapshot.import-enabled", Boolean.class, true);
        if (!importEnabled) {
            log.info("⏭️ Importación de snapshot inicial deshabilitada por configuración.");
            return;
        }
        log.info("🚀 Verificando snapshot inicial...");
        snapshotService.importFullSnapshotIfNeeded();
    }
}
