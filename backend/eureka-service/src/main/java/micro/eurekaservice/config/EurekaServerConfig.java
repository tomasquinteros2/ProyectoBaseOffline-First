package micro.eurekaservice.config;

import com.netflix.discovery.EurekaClient;
import com.netflix.discovery.EurekaClientConfig;
import com.netflix.eureka.resources.ServerCodecs;
import com.netflix.eureka.transport.EurekaServerHttpClientFactory;
import org.springframework.cloud.netflix.eureka.server.EurekaServerConfigBean;
import org.springframework.cloud.netflix.eureka.server.InstanceRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

@Configuration
public class EurekaServerConfig {

    @Bean
    @Profile("offline")
    public EurekaServerConfigBean eurekaServerConfigBean() {
        EurekaServerConfigBean config = new EurekaServerConfigBean();
        config.setRegistrySyncRetries(0);
        config.setEnableSelfPreservation(false);
        config.setResponseCacheUpdateIntervalMs(30000);
        config.setPeerEurekaNodesUpdateIntervalMs(600000);
        return config;
    }

    @Bean
    @Primary
    public static InstanceRegistry instanceRegistry(
                                                     com.netflix.eureka.EurekaServerConfig serverConfig,
                                                     EurekaClientConfig clientConfig,
                                                     ServerCodecs serverCodecs,
                                                     EurekaClient eurekaClient,
                                                     EurekaServerHttpClientFactory httpClientFactory
    ) {
        return new PersistentInstanceRegistry(
                serverConfig,
                clientConfig,
                serverCodecs,
                eurekaClient,
                httpClientFactory
        );
    }
}