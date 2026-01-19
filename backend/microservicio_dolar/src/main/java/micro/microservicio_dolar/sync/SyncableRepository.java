package micro.microservicio_dolar.sync;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.NoRepositoryBean;

@NoRepositoryBean
public interface SyncableRepository<T,ID> extends JpaRepository<T, ID> {
    String getEntityClassName();
    Class<T> getEntityClass();
}