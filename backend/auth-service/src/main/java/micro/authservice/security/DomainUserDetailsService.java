package micro.authservice.security;

import micro.authservice.entity.Authority;
import micro.authservice.entity.Usuario;
import micro.authservice.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Component("userDetailsService")
public class DomainUserDetailsService implements UserDetailsService {

    private final Logger log = LoggerFactory.getLogger(DomainUserDetailsService.class);
    private final UsuarioRepository usuarioRepository;

    public DomainUserDetailsService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(final String username) {
        log.debug("Authenticating user '{}'", username);
        String lowercaseUsername = username.toLowerCase();
        return usuarioRepository.findOneWithAuthoritiesByUsernameIgnoreCase(lowercaseUsername)
                .map(user -> createSpringSecurityUser(lowercaseUsername, user))
                .orElseThrow(() -> new UsernameNotFoundException("User " + lowercaseUsername + " was not found in the database"));
    }

    private org.springframework.security.core.userdetails.User createSpringSecurityUser(String lowercaseUsername, Usuario usuario) {
        List<GrantedAuthority> grantedAuthorities = usuario.getAuthorities().stream()
                .map(Authority::getName)
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
        return new org.springframework.security.core.userdetails.User(usuario.getUsername(),
                usuario.getPassword(),
                grantedAuthorities);
    }
}