package micro.microservicio_dolar.config;

import lombok.RequiredArgsConstructor;
import micro.microservicio_dolar.services.DolarService;
import micro.microservicio_dolar.sync.BeanUtil;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final DolarService dolarService;
    private final BeanUtil beanUtil; // Inyectar BeanUtil para forzar el orden de inicialización

    @Override
    public void run(String... args) throws Exception {
        dolarService.init();
    }
}