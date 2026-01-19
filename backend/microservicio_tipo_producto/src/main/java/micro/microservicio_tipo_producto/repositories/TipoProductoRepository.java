package micro.microservicio_tipo_producto.repositories;

import micro.microservicio_tipo_producto.entities.TipoProducto;
import micro.microservicio_tipo_producto.sync.SyncableRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TipoProductoRepository extends SyncableRepository<TipoProducto, Long> {

    Optional<TipoProducto> findByNombre(String nombre);

    List<TipoProducto> findByNombreIn(List<String> nombres);

    @Override
    default String getEntityClassName() {
        return TipoProducto.class.getSimpleName();
    }

    @Override
    default Class<TipoProducto> getEntityClass() {
        return TipoProducto.class;
    }

    Optional<TipoProducto> findByNombreIgnoreCase(String nombre);

    @Query(value = "SELECT COALESCE(MAX(EXTRACT(EPOCH FROM updated_at)), 0) FROM tipo_producto", nativeQuery = true)
    Long findMaxLastModifiedTimestamp();
}
