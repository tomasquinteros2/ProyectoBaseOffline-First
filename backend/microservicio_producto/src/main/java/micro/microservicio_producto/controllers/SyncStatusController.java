package micro.microservicio_producto.controllers;

import micro.microservicio_producto.web.dto.SyncStatusDTO;
import micro.microservicio_producto.services.SyncStatusService;
import org.slf4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/sync")
public class SyncStatusController {
    private final Logger log = org.slf4j.LoggerFactory.getLogger(SyncStatusController.class);
    private final SyncStatusService service;

    public SyncStatusController(SyncStatusService service) {
        this.service = service;
    }

    @GetMapping("/status")
    public ResponseEntity<SyncStatusDTO> status() {
        return ResponseEntity.ok(service.getStatus());
    }
}
