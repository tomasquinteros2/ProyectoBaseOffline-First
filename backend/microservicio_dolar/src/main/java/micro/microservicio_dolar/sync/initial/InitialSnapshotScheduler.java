package micro.microservicio_dolar.sync.initial;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

//@Component
@RequiredArgsConstructor
@Slf4j
public class InitialSnapshotScheduler {

    private final InitialSnapshotService snapshotService;

    // Ejecuta el snapshot completo cada día a las 03:00 (ajustable vía cron).
    // @Scheduled(cron = "${app.sync.snapshot.cron:0 0/5 * * * *}")
    public void scheduledExport() {
        log.info("🕒 Generando snapshot completo programado...");
        snapshotService.exportFullSnapshot();
    }
}