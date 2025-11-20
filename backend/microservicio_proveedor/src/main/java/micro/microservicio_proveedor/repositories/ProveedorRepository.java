package micro.microservicio_proveedor.repositories;

import micro.microservicio_proveedor.entities.Proveedor;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ProveedorRepository extends JpaRepository<Proveedor, Long> {

    Optional<Proveedor> findByNombre(String nombre);

    @Query("SELECT DISTINCT p FROM Proveedor p LEFT JOIN FETCH p.razonesSociales rs LEFT JOIN FETCH rs.cuentasBancarias WHERE p.id = :id")
    Optional<Proveedor> findFullById(Long id);

    @Override
    @EntityGraph(value = "proveedor-with-razones-cuentas", type = EntityGraph.EntityGraphType.LOAD)
    List<Proveedor> findAll();

    @Query(value = "SELECT COALESCE(MAX(EXTRACT(EPOCH FROM updated_at)), 0) FROM proveedor", nativeQuery = true)
    Long findMaxLastModifiedTimestamp();
}
