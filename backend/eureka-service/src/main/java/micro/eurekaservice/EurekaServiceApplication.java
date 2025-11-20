/*package micro.example.eurekaservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceTransactionManagerAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;
import org.springframework.cloud.client.loadbalancer.LoadBalancerAutoConfiguration;

@SpringBootApplication(
        exclude = {
                DataSourceAutoConfiguration.class,
                DataSourceTransactionManagerAutoConfiguration.class,
                HibernateJpaAutoConfiguration.class,
                LoadBalancerAutoConfiguration.class
        }
)
@EnableEurekaServer
public class EurekaServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(EurekaServiceApplication.class, args);
    }

}
*/
package micro.eurekaservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType; // Asegúrate de importar esta clase
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

@SpringBootApplication
@EnableEurekaServer
public class EurekaServiceApplication {

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(EurekaServiceApplication.class);
        // ✅ FORZAR el tipo de aplicación a SERVLET.
        // Esto soluciona el problema de que Spring no detecta el entorno web.
        app.setWebApplicationType(WebApplicationType.SERVLET);
        app.run(args);
    }
}
