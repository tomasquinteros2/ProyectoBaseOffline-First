package micro.microservicio_dolar.repository;

import micro.microservicio_dolar.entities.Dolar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DolarRepository extends JpaRepository<Dolar, Long> {
}
