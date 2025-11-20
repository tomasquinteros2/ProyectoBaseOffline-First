package micro.eurekaservice.config;

import com.netflix.appinfo.*;
import org.springframework.cloud.commons.util.InetUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.cloud.netflix.eureka.EurekaInstanceConfigBean;

@Configuration
public class EurekaClientConfig {

    @Bean
    public ApplicationInfoManager applicationInfoManager(EurekaInstanceConfig config) {
        InstanceInfo instanceInfo = InstanceInfo.Builder.newBuilder()
                .setAppName(config.getAppname())
                .setHostName(config.getHostName(false))
                .setIPAddr(config.getIpAddress())
                .setPort(config.getNonSecurePort())
                .setInstanceId(config.getInstanceId())
                .setDataCenterInfo(config.getDataCenterInfo())
                .build();

        return new ApplicationInfoManager(config, instanceInfo);
    }

    @Bean
    public EurekaInstanceConfig eurekaInstanceConfig(InetUtils inetUtils) {
        EurekaInstanceConfigBean config = new EurekaInstanceConfigBean(inetUtils);

        config.setAppname("eureka-service");
        config.setInstanceId("eureka-service:8761");
        config.setHostname("localhost");
        config.setIpAddress("127.0.0.1");
        config.setNonSecurePort(8761);
        config.setSecurePort(443);
        config.setStatusPageUrlPath("/info");

        config.setDataCenterInfo(new MyDataCenterInfo(DataCenterInfo.Name.MyOwn));

        return config;
    }
}