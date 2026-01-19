package micro.microservicio_producto.sync;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.NoRepositoryBean;
import org.yaml.snakeyaml.events.Event;

@NoRepositoryBean
public interface SyncableRepository<T,ID> extends JpaRepository<T, ID> {
    String getEntityClassName();
    Class<T> getEntityClass();
}