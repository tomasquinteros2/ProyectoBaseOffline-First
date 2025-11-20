package micro.microservicio_tipo_producto.controller;

import micro.microservicio_tipo_producto.entities.TipoProducto;
import micro.microservicio_tipo_producto.services.TipoProductoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tiposproducto")
public class TipoProductoController {

    private final TipoProductoService tipoProductoService;
    private final Logger log = LoggerFactory.getLogger( TipoProductoController.class );
    public TipoProductoController(TipoProductoService tipoProductoService) {
        this.tipoProductoService = tipoProductoService;
    }

    @GetMapping("")
    public ResponseEntity<List<TipoProducto>> getAllTiposProducto() {
        List<TipoProducto> tipos = tipoProductoService.findAll();
        return ResponseEntity.ok(tipos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TipoProducto> getTipoProductoById(@PathVariable Long id) {
        log.info("Llego a controller getTipoProductoById");
        TipoProducto tipo = tipoProductoService.findById(id);
        log.info("Volvio a controller getTipoProductoById: " + tipo);
        return ResponseEntity.ok(tipo);
    }

    @PostMapping("")
    public ResponseEntity<TipoProducto> createTipoProducto(@RequestBody TipoProducto tipoProducto) {
        TipoProducto nuevoTipo = tipoProductoService.save(tipoProducto);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoTipo);
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<TipoProducto>> createBulkTiposProducto(@RequestBody List<TipoProducto> tiposProducto) {
        List<TipoProducto> tiposGuardados = tipoProductoService.saveAll(tiposProducto);
        return ResponseEntity.status(HttpStatus.CREATED).body(tiposGuardados);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TipoProducto> updateTipoProducto(@PathVariable Long id, @RequestBody TipoProducto tipoProducto) {
        TipoProducto tipoActualizado = tipoProductoService.update(id, tipoProducto);
        return ResponseEntity.ok(tipoActualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTipoProducto(@PathVariable Long id) {
        tipoProductoService.delete(id);
        return ResponseEntity.noContent().build();
    }
    @PostMapping("/validar")
    public ResponseEntity<Void> validarTiposProducto(@RequestBody List<Long> ids) {
        tipoProductoService.validarExistencia(ids);
        return ResponseEntity.ok().build();
    }
}