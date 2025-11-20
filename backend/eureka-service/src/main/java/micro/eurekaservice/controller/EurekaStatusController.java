package micro.eurekaservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.netflix.eureka.server.InstanceRegistry;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/eureka-status")
public class EurekaStatusController {


    @Autowired
    private InstanceRegistry registry;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getEurekaStatus() {
        return ResponseEntity.ok(Map.of(
                "status", "offline",
                "cached_instances", getCachedInstancesCount(),
                "last_updated", getLastUpdateTime()
        ));
    }

    private int getCachedInstancesCount() {
        return 0;
    }

    private String getLastUpdateTime() {
        return LocalDateTime.now().toString();
    }
}