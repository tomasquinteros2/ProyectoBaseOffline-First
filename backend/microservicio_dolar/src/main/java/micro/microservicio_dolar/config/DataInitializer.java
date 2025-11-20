package micro.microservicio_dolar.config;

import micro.microservicio_dolar.services.DolarService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final DolarService dolarService;

    public DataInitializer(DolarService dolarService) {
        this.dolarService = dolarService;
    }

    @Override
    public void run(String... args) throws Exception {
        dolarService.init();
    }
}