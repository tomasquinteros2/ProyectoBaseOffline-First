package micro.microservicio_producto.repositories;

import micro.microservicio_producto.entities.Producto;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

@Repository
public interface ProductoRepository extends JpaRepository<Producto, Long> , JpaSpecificationExecutor<Producto> {

    
    @Override
    @EntityGraph(attributePaths = {"productosRelacionados"})
    Optional<Producto> findById(Long id);


    @Override
    List<Producto> findAll();

    @Query("SELECT p FROM Producto p")
    Stream<Producto> findAllAsStream();

    @Override
    List<Producto> findAll(Specification<Producto> spec);

    @Override
    Page<Producto> findAll(Specification<Producto> spec,Pageable pageable);


    /**
     * Busca productos por descripción, cargando sus relaciones.
     */
    @Query("SELECT p FROM Producto p WHERE LOWER(p.descripcion) LIKE LOWER(CONCAT('%', :desc, '%'))")
    Optional<List<Producto>> findByDesc(@Param("desc") String desc);

    /**
     * Busca un producto por su código único, cargando sus relaciones.
     */
    @Query("SELECT p FROM Producto p WHERE p.codigoProducto = :codigoProducto")
    List<Producto> findByCodigoProducto(@Param("codigoProducto") String codigoProducto);

    @Query("SELECT p FROM Producto p WHERE p.codigoProducto = :codigo AND p.proveedorId = :proveedorId")
    Optional<Producto> findByCodigoProductoAndProveedorId(@Param("codigo") String codigo, @Param("proveedorId") Long proveedorId);
    /**
     * Busca productos por el ID de su tipo, cargando sus relaciones.
     */
    Optional<List<Producto>> findByTipoProductoId(Long id);

    long countByCostoFijoIsFalse();

    @Query("SELECT p FROM Producto p WHERE p.codigoProducto IN :codigos")
    List<Producto> findAllByCodigoProductoIn(@Param("codigos") List<String> codigos);

    @Query(value = "SELECT producto_relacionado_id FROM productos_relacionados WHERE producto_id = :productoId", nativeQuery = true)
    List<Long> findProductosRelacionadosIdsByProductoId(@Param("productoId") Long productoId);

    @Query(value = "SELECT producto_id, producto_relacionado_id FROM productos_relacionados WHERE producto_id IN :productoIds", nativeQuery = true)
    List<Object[]> findRelacionadosIdsByProductoIds(@Param("productoIds") List<Long> productoIds);

    @Modifying
    @Query(value = "DELETE FROM \"productos_relacionados\" WHERE \"producto_id\" = :productoId OR \"producto_relacionado_id\" = :productoId", nativeQuery = true)
    void eliminarRelaciones(@Param("productoId") Long productoId);

    @Modifying
    @Query(value = "UPDATE Producto p SET p.cantidad = p.cantidad - :cantidad WHERE p.id = :id")
    int descontar(@Param("id") Long id, @Param("cantidad") Integer cantidad);

    @Modifying
    @Query(value = "DELETE FROM \"productos_relacionados\" WHERE \"producto_id\" IN :ids OR \"producto_relacionado_id\" IN :ids", nativeQuery = true)
    void eliminarRelacionesEnBloque(List<Long> ids);

    List<Producto> findAllByCostoFijoIsFalse();

    @Query(value = "SELECT COALESCE(MAX(EXTRACT(EPOCH FROM updated_at)), 0) FROM producto", nativeQuery = true)
    Long findMaxLastModifiedTimestamp();
}