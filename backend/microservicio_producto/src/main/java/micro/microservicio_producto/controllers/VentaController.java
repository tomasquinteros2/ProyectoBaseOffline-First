package micro.microservicio_producto.controllers;

import micro.microservicio_producto.entities.DTO.ProductoDTO;
import micro.microservicio_producto.entities.DTO.VentaRequestDTO;
import micro.microservicio_producto.entities.DTO.VentaResponseDTO;
import micro.microservicio_producto.entities.Venta;
import micro.microservicio_producto.services.ProductoService;
import micro.microservicio_producto.services.VentaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/ventas")
public class VentaController {
    private final Logger log = LoggerFactory.getLogger( VentaController.class );

    private final VentaService ventaService;

    public VentaController(VentaService ventaService) {
        this.ventaService = ventaService;
    }
    @GetMapping("")
    public ResponseEntity<List<VentaResponseDTO>> getAllVentas() {
        List<VentaResponseDTO> ventas = ventaService.findAllVentas();
        return ResponseEntity.ok(ventas);
    }
    @PostMapping("/registrar")
    public ResponseEntity<VentaResponseDTO> registrarVenta(@RequestBody VentaRequestDTO ventaRequest) {
        log.info("Recibida solicitud para registrar venta con {} items.", ventaRequest.getItems().size());
        VentaResponseDTO ventaGuardada = ventaService.registrarVentaCompleta(ventaRequest);
        log.info("Venta registrada con N° de comprobante: {}", ventaGuardada.getNumeroComprobante());
        return ResponseEntity.status(HttpStatus.CREATED).body(ventaGuardada);
    }
    @GetMapping("/comprobante/{numero}")
    public ResponseEntity<VentaResponseDTO> getVentaByNumeroComprobante(@PathVariable String numero) {
        return ventaService.buscarComprobantePorNumero(numero)
                .map(ResponseEntity::ok) // Si se encuentra, devuelve 200 OK con la venta
                .orElse(ResponseEntity.notFound().build()); // Si no, devuelve 404 Not Found
    }
}