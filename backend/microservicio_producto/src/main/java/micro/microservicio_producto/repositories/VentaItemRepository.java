package micro.microservicio_producto.repositories;

import micro.microservicio_producto.entities.VentaItem;
import micro.microservicio_producto.sync.SyncableRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VentaItemRepository extends JpaRepository<VentaItem, Long> {
}