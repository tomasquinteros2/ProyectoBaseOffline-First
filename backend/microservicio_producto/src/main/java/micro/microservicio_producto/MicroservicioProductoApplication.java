package micro.microservicio_producto;


import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.io.IOException;

@SpringBootApplication
@EnableFeignClients
@EnableScheduling
public class MicroservicioProductoApplication {


    public static void main(String[] args) {
        SpringApplication.run(MicroservicioProductoApplication.class, args);
    }


}
