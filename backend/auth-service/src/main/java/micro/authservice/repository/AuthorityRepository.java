package micro.authservice.repository;

import micro.authservice.entity.Authority;
import micro.authservice.sync.SyncableRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AuthorityRepository extends SyncableRepository<Authority, Long>, JpaSpecificationExecutor<Authority> {
    Optional<Authority> findByName(String name);

    default String getEntityClassName() {
        return Authority.class.getSimpleName();
    }

    default Class<Authority> getEntityClass() { return Authority.class; }

}