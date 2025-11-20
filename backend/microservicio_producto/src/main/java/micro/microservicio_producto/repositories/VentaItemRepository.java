package micro.microservicio_producto.repositories;

import micro.microservicio_producto.entities.VentaItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VentaItemRepository extends JpaRepository<VentaItem, Long> {
}