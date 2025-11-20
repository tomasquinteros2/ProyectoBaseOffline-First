package micro.microservicio_producto.repositories;

import micro.microservicio_producto.entities.Venta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface VentaRepository extends JpaRepository<Venta, Long> {
    List<Venta> findAllByFechaVentaBetween(LocalDateTime start, LocalDateTime end);

    Optional<Venta> findByNumeroComprobante(String numeroComprobante);

    List<Venta> findAllByFechaVentaBefore(LocalDateTime fechaLimite);

    Optional<Venta> findByNumeroComprobanteEndingWith(String sufijo);


    @EntityGraph(attributePaths = "items")
    List<Venta> findAllByOrderByFechaVentaDesc();
}