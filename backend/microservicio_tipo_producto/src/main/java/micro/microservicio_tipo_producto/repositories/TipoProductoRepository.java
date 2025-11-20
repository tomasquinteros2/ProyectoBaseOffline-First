package micro.microservicio_tipo_producto.repositories;

import micro.microservicio_tipo_producto.entities.TipoProducto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TipoProductoRepository extends JpaRepository<TipoProducto, Long> {

    Optional<TipoProducto> findByNombre(String nombre);

    List<TipoProducto> findByNombreIn(List<String> nombres);
}