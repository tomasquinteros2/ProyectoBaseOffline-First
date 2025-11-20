package micro.eurekaservice.config;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.netflix.appinfo.ApplicationInfoManager;
import com.netflix.appinfo.DataCenterInfo;
import com.netflix.appinfo.InstanceInfo;
import com.netflix.appinfo.LeaseInfo;
import com.netflix.discovery.EurekaClient;
import com.netflix.discovery.EurekaClientConfig;
import com.netflix.eureka.EurekaServerConfig;
import com.netflix.eureka.resources.ServerCodecs;
import com.netflix.eureka.transport.EurekaServerHttpClientFactory;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cloud.netflix.eureka.server.InstanceRegistry;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;

public class PersistentInstanceRegistry extends InstanceRegistry {

    private static final Logger logger = LoggerFactory.getLogger(PersistentInstanceRegistry.class);
    private static final String CACHE_FILE_PATH = "/data/eureka_cache.json";
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PersistentInstanceRegistry(EurekaServerConfig serverConfig,
                                      EurekaClientConfig clientConfig,
                                      ServerCodecs serverCodecs,
                                      @Qualifier("offlineDummyEurekaClient") EurekaClient eurekaClient,
                                      EurekaServerHttpClientFactory httpClientFactory) {
        super(
                serverConfig,
                clientConfig,
                serverCodecs,
                eurekaClient,
                httpClientFactory,
                1,
                0
        );
        logger.info("PersistentInstanceRegistry inicializado. Cache file: {}", CACHE_FILE_PATH);
    }

    @Override
    public void register(InstanceInfo info, boolean isReplication) {
        logger.debug("Registering instance: {} with isReplication: {}", info.getInstanceId(), isReplication);
        super.register(info, isReplication);
        saveToFile();
    }

    @Override
    public void openForTraffic(ApplicationInfoManager applicationInfoManager, int count) {
        logger.info("Opening for traffic. Loading instances from cache file if exists.");
        loadFromFile();
        super.openForTraffic(applicationInfoManager, count);
    }

    @Override
    public boolean cancel(String appName, String serverId, boolean isReplication) {
        logger.debug("Canceling instance: {}/{} with isReplication: {}", appName, serverId, isReplication);
        boolean result = super.cancel(appName, serverId, isReplication);
        if (result) {
            saveToFile();
        }
        return result;
    }

    private void saveToFile() {
        try {
            File cacheFile = new File(CACHE_FILE_PATH);
            File parentDir = cacheFile.getParentFile();
            if (parentDir != null && !parentDir.exists()) {
                if (parentDir.mkdirs()) {
                    logger.info("Created directory for cache file: {}", parentDir.getAbsolutePath());
                } else {
                    logger.error("Failed to create directory for cache file: {}", parentDir.getAbsolutePath());
                    return;
                }
            }

            Map<String, Data> simplifiedRegistry = new HashMap<>();
            this.getSortedApplications().forEach(app ->
                    app.getInstances().forEach(instance -> {
                        if (instance.getStatus() != null &&
                                instance.getStatus() != InstanceInfo.InstanceStatus.DOWN &&
                                instance.getStatus() != InstanceInfo.InstanceStatus.UNKNOWN) {
                            simplifiedRegistry.put(
                                    instance.getInstanceId(),
                                    new Data(
                                            instance.getAppName(),
                                            instance.getHostName(),
                                            instance.getPort(),
                                            instance.getStatus() != null ? instance.getStatus().name() : null
                                    )
                            );
                        }
                    })
            );
            objectMapper.writeValue(cacheFile, simplifiedRegistry);
            logger.info("Successfully saved {} instances to cache file: {}", simplifiedRegistry.size(), CACHE_FILE_PATH);
        } catch (IOException e) {
            logger.error("Error saving instances to cache file: {}", CACHE_FILE_PATH, e);
        }
    }

    private void loadFromFile() {
        Path cache = Paths.get("/data/eureka_cache.json");
        if (!Files.exists(cache)) {
            return;
        }
        try (InputStream in = Files.newInputStream(cache)) {
            ObjectMapper mapper = new ObjectMapper()
                    .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
            Map<String, Data> stored = mapper.readValue(in, new TypeReference<Map<String, Data>>() {});
            // TODO: integra 'stored' en tu estructura interna (p.ej. this.registry.putAll(stored))
            logger.info("Cargadas {} instancias desde caché persistente.", stored.size());
        } catch (Exception ex) {
            logger.error("Error cargando instancias desde {}. Se renombrará como .corrupt", cache, ex);
            try {
                Files.move(cache,
                        cache.resolveSibling("eureka_cache.json.corrupt"),
                        StandardCopyOption.REPLACE_EXISTING);
            } catch (Exception ignore) {
                logger.warn("No se pudo renombrar el archivo de caché corrupto: {}", cache);
            }
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Data {
        private String appName;
        private String hostName;
        private Integer port;
        private String status;

        public Data() {
        }

        @JsonCreator
        public Data(@JsonProperty("appName") String appName,
                    @JsonProperty("hostName") String hostName,
                    @JsonProperty("port") Integer port,
                    @JsonProperty("status") String status) {
            this.appName = appName;
            this.hostName = hostName;
            this.port = port;
            this.status = status;
        }

        public String getAppName() { return appName; }
        public void setAppName(String appName) { this.appName = appName; }
        public String getHostName() { return hostName; }
        public void setHostName(String hostName) { this.hostName = hostName; }
        public Integer getPort() { return port; }
        public void setPort(Integer port) { this.port = port; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }
}