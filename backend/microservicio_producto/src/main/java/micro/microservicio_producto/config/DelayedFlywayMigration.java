package micro.microservicio_producto.config; // Asegúrate de que el paquete sea el correcto

import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class DelayedFlywayMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DelayedFlywayMigration.class);

    private final Flyway flyway;

    public DelayedFlywayMigration(Flyway flyway) {
        this.flyway = flyway;
    }

    /**
     * Este método se ejecuta DESPUÉS de que el contexto de Spring se haya inicializado
     * completamente, incluyendo Hibernate y la creación de tablas.
     */
    @Override
    public void run(ApplicationArguments args) {
        log.info("--- Iniciando migración manual de Flyway después del arranque de Hibernate ---");
        flyway.migrate();
        log.info("--- Migración manual de Flyway completada ---");
    }
}
    