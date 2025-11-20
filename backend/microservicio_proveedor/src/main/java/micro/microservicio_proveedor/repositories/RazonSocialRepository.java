package micro.microservicio_proveedor.repositories;

import micro.microservicio_proveedor.entities.RazonSocial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RazonSocialRepository extends JpaRepository<RazonSocial, Long> {
}