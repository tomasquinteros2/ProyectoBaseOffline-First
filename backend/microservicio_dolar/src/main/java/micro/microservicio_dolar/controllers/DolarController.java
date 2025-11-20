package micro.microservicio_dolar.controllers;

import micro.microservicio_dolar.entities.Dolar;
import micro.microservicio_dolar.services.DolarService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/dolar")
public class DolarController {

    private final DolarService dolarService;

    public DolarController(DolarService ds) {
        this.dolarService = ds;
    }

    @GetMapping("")
    public ResponseEntity<List<Dolar>> getAllDolar() {
        List<Dolar> dolares = dolarService.findAll();
        return ResponseEntity.ok(dolares);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BigDecimal> getDolarById(@PathVariable Long id) {
        BigDecimal dolar = dolarService.getValorDolar(id);
        return ResponseEntity.ok(dolar);
    }

    @PostMapping("")
    public ResponseEntity<Dolar> createDolar(@RequestBody Dolar entity) {
        Dolar savedDolar = dolarService.save(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedDolar);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Dolar> updateDolar(@PathVariable Long id, @RequestBody Dolar dolar) {
        Dolar updatedDolar = dolarService.update(id, dolar);
        return ResponseEntity.ok(updatedDolar);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDolar(@PathVariable Long id) {
        dolarService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/force-update")
    public ResponseEntity<Map<String, String>> forceUpdateDolar() {
        dolarService.actualizarPrecioDolar();

        Map<String, String> response = Map.of(
                "message", "La tarea de actualización del dólar ha sido iniciada."
        );
        return ResponseEntity.ok(response);
    }
}