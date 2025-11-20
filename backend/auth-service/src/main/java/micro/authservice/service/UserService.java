package micro.authservice.service;

import micro.authservice.dto.UserDTO;
import micro.authservice.entity.Authority;
import micro.authservice.entity.Usuario;
import micro.authservice.repository.AuthorityRepository;
import micro.authservice.repository.UsuarioRepository;
import micro.authservice.security.AuthorityConstant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

@Service
public class UserService {
    private final Logger log = LoggerFactory.getLogger( UserService.class );
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthorityRepository authorityRepository;
    private final AuthService authService;

    public UserService(UsuarioRepository usuarioRepository,
                       PasswordEncoder passwordEncoder,
                       AuthorityRepository authorityRepository,
                       AuthService authService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.authorityRepository = authorityRepository;
        this.authService = authService;
    }

    @Transactional
    public Usuario createUser(UserDTO userDTO, String inviteCode) {
        // Determinar rol solicitado (por defecto VIEWER)
        String role = userDTO.getRole() != null ? userDTO.getRole() : AuthorityConstant.VIEWER;

        // Si el rol requiere código de invitación, validarlo
        if (!AuthorityConstant.USER.equals(role)) {
            if (inviteCode == null || inviteCode.isBlank()) {
                throw new IllegalArgumentException("Se requiere un código de invitación para este rol");
            }
            if (!authService.validateAndUseInviteCode(inviteCode, userDTO.getUsername())) {
                throw new IllegalArgumentException("Código de invitación inválido o expirado");
            }
        }

        // Verificar si el usuario ya existe
        if (usuarioRepository.findByUsername(userDTO.getUsername()).isPresent()) {
            throw new IllegalArgumentException("El nombre de usuario ya existe");
        }

        // Crear el usuario
        Usuario newUser = new Usuario();
        newUser.setUsername(userDTO.getUsername().toLowerCase());
        newUser.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        newUser.setAccountVerified(true);
        newUser.setTwoFactorEnabled(false);

        // Asignar autoridades según el rol solicitado
        Set<Authority> authorities = new HashSet<>();
        Authority authority = authorityRepository.findByName(role)
                .orElseThrow(() -> new IllegalArgumentException("Rol no encontrado: " + role));

        authorities.add(authority);
        newUser.setAuthorities(authorities);
        return usuarioRepository.save(newUser);
    }
}
