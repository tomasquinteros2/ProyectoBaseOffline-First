package micro.eurekaservice.config;

import org.springframework.cloud.netflix.eureka.EurekaClientConfigBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class EurekaClientProfilesConfig {

    @Bean()
    @Profile("!offline")
    public EurekaClientConfigBean onlineEurekaClientConfig() {
        EurekaClientConfigBean config = new EurekaClientConfigBean();
        config.setRegisterWithEureka(true);
        config.setFetchRegistry(true);
        config.setRegistryFetchIntervalSeconds(30);
        return config;
    }

    @Bean
    @Profile("offline")
    public EurekaClientConfigBean offlineEurekaClientConfigBean() {
        EurekaClientConfigBean config = new EurekaClientConfigBean();
        config.setRegisterWithEureka(false);
        config.setFetchRegistry(false);
        config.setServiceUrl(Map.of("defaultZone", "http://localhost:8761/eureka/"));
        return config;
    }
}