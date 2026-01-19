package micro.authservice.repository;

import micro.authservice.entity.Usuario;
import micro.authservice.sync.SyncableRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsuarioRepository extends SyncableRepository<Usuario, Long>, JpaSpecificationExecutor<Usuario> {

    @EntityGraph(attributePaths = "authorities")
    Optional<Usuario> findOneWithAuthoritiesByUsernameIgnoreCase(String username);

    Optional<Usuario> findByUsername(String username);

    default String getEntityClassName() {
        return Usuario.class.getSimpleName();
    }

    default Class<Usuario> getEntityClass() { return Usuario.class; }

}