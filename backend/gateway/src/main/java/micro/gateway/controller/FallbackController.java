package micro.gateway.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/fallback")
public class FallbackController {

    @GetMapping("/dolar")
    public ResponseEntity<Map<String, Object>> dolarFallback() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                        "status", "offline",
                        "message", "Servicio Dolar no disponible",
                        "timestamp", Instant.now()
                ));
    }

    @GetMapping("/producto")
    public ResponseEntity<Map<String, Object>> productoFallback() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                        "status", "offline",
                        "message", "Servicio Producto no disponible",
                        "timestamp", Instant.now()
                ));
    }
}