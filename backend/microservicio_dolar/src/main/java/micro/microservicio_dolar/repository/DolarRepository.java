package micro.microservicio_dolar.repository;

import micro.microservicio_dolar.entities.Dolar;
import micro.microservicio_dolar.sync.SyncableRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DolarRepository extends SyncableRepository<Dolar, Long> {
    @Override
    default String getEntityClassName() {
        return Dolar.class.getSimpleName();
    }

    @Override
    default Class<Dolar> getEntityClass() { return Dolar.class; }
}
