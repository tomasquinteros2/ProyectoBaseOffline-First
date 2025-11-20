package micro.microservicio_tipo_producto.config;

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FlywayConfig {

    /**
     * Proporciona una estrategia de migración vacía para prevenir que Flyway
     * se ejecute automáticamente al inicio. Nosotros lo controlaremos manualmente.
     */
    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        // Devuelve una estrategia que no hace NADA.
        return flyway -> {
            // No-op
        };
    }
}