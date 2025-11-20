package micro.microservicio_producto.repositories;

import micro.microservicio_producto.entities.VentaArchivada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VentaArchivadaRepository extends JpaRepository<VentaArchivada, Long> {
    Optional<VentaArchivada> findByNumeroComprobante(String numeroComprobante);
    Optional<VentaArchivada> findByNumeroComprobanteEndingWith(String sufijo);
}