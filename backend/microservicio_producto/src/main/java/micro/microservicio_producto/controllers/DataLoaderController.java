package micro.microservicio_producto.controllers;

import micro.microservicio_producto.services.DataLoaderService;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dev/data-loader")
@Profile("offline")
public class DataLoaderController {

    private final DataLoaderService dataLoaderService;

    public DataLoaderController(DataLoaderService dataLoaderService) {
        this.dataLoaderService = dataLoaderService;
    }

    @PostMapping("/load-from-csv")
    public ResponseEntity<String> loadData() {
        try {
            int count = dataLoaderService.cargarDatosDesdeCSV();
            if (count > 0) {
                return ResponseEntity.ok(count + " productos cargados exitosamente desde CSV.");
            } else {
                return ResponseEntity.ok("La base de datos ya contenía datos. No se realizó la carga.");
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al cargar datos desde CSV: " + e.getMessage());
        }
    }
}