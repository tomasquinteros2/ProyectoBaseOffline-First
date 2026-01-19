package micro.microservicio_proveedor.sync.initial;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// @RestController
@RequiredArgsConstructor
@RequestMapping("/api/sync/snapshot")
public class InitialSnapshotController {

    private final InitialSnapshotService snapshotService;

    @PostMapping("/export")
    public ResponseEntity<Void> exportSnapshot() {
        snapshotService.exportFullSnapshot();
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/import")
    public ResponseEntity<Void> importSnapshot() {
        snapshotService.importFullSnapshotIfNeeded();
        return ResponseEntity.accepted().build();
    }
}