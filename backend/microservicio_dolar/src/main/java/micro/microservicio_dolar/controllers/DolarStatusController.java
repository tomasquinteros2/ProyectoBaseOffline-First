package micro.microservicio_dolar.controllers;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/dolar-status")
public class DolarStatusController {

    @Value("${app.offline-mode:false}")
    private boolean offlineMode;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(Map.of(
                "status", offlineMode ? "offline" : "online",
                "message", offlineMode ? "Usando valor de dólar offline" : "Conectado a API externa",
                "last_update", LocalDateTime.now().toString()
        ));
    }
}