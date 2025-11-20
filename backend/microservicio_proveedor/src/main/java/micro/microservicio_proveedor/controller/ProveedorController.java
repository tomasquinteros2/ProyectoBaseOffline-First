package micro.microservicio_proveedor.controller;

import micro.microservicio_proveedor.entities.Proveedor;
import micro.microservicio_proveedor.entities.dto.LastModifiedDTO;
import micro.microservicio_proveedor.entities.dto.ProveedorResponseDTO;
import micro.microservicio_proveedor.services.ProveedorService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/proveedores")
public class ProveedorController {

    private final ProveedorService proveedorService;

    public ProveedorController(ProveedorService proveedorService) {
        this.proveedorService = proveedorService;
    }

    @GetMapping("")
    public ResponseEntity<List<Proveedor>> getAll() {
        return ResponseEntity.ok(proveedorService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProveedorResponseDTO> getProveedor(@PathVariable Long id) {
        return ResponseEntity.ok(proveedorService.findDtoById(id));
    }

    @PostMapping("")
    public ResponseEntity<Proveedor> save(@RequestBody Proveedor proveedor) {
        Proveedor nuevoProveedor = proveedorService.save(proveedor);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoProveedor);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Proveedor> update(@PathVariable Long id, @RequestBody Proveedor proveedor) {
        Proveedor updatedProveedor = proveedorService.update(id, proveedor);
        return ResponseEntity.ok(updatedProveedor);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        proveedorService.delete(id);
        return ResponseEntity.noContent().build();
    }
    @PostMapping("/validar")
    public ResponseEntity<Void> validarProveedores(@RequestBody List<Long> ids) {
        proveedorService.validarExistencia(ids);
        return ResponseEntity.ok().build();
    }
    @GetMapping("/last-modified")
    public ResponseEntity<LastModifiedDTO> getLastModified() {
        LastModifiedDTO lastModified = proveedorService.getLastModified();
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .body(lastModified);
    }
}