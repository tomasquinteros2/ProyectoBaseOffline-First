package micro.authservice.repository;

import micro.authservice.entity.Usuario;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    @EntityGraph(attributePaths = "authorities") // Carga las autoridades junto con el usuario
    Optional<Usuario> findOneWithAuthoritiesByUsernameIgnoreCase(String username);

    Optional<Usuario> findByUsername(String username);
}