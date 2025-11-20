package micro.authservice;

import micro.authservice.entity.Authority;
import micro.authservice.repository.AuthorityRepository;
import micro.authservice.security.AuthorityConstant; // Asegúrate que este import sea correcto según tu estructura de paquetes
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.Bean; // Importar @Bean
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableDiscoveryClient
@EnableAsync
public class AuthServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuthServiceApplication.class, args);

    }

    // Bean para inicializar las autoridades/roles en la base de datos
    @Bean
    CommandLineRunner initAuthorities(AuthorityRepository authorityRepository) {
        return args -> {
            // Crear rol ADMIN si no existe
            if (authorityRepository.findByName(AuthorityConstant.ADMIN).isEmpty()) {
                Authority adminAuthority = new Authority();
                adminAuthority.setName(AuthorityConstant.ADMIN);
                authorityRepository.save(adminAuthority);
                System.out.println("Created ADMIN authority");
            }
            // Crear rol USER si no existe
            if (authorityRepository.findByName(AuthorityConstant.USER).isEmpty()) {
                Authority userAuthority = new Authority();
                userAuthority.setName(AuthorityConstant.USER);
                authorityRepository.save(userAuthority);
                System.out.println("Created USER authority");
            }
            // Crear rol VIEWER si no existe
            if (authorityRepository.findByName(AuthorityConstant.VIEWER).isEmpty()) {
                Authority viewerAuthority = new Authority();
                viewerAuthority.setName(AuthorityConstant.VIEWER);
                authorityRepository.save(viewerAuthority);
                System.out.println("Created VIEWER authority");
            }
        };
    }
}