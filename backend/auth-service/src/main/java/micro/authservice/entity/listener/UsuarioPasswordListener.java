package micro.authservice.entity.listener;

import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import micro.authservice.entity.Usuario;
import micro.authservice.sync.BeanUtil;
import micro.authservice.sync.SyncContext;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;

public class UsuarioPasswordListener {

    @PrePersist
    @PreUpdate
    public void ensurePasswordHash(Usuario usuario) {
        if (usuario == null) {
            return;
        }
        if (SyncContext.isSyncing() || usuario.isSkipPasswordEncoding()) {
            return;
        }

        String currentPassword = usuario.getPassword();
        if (!StringUtils.hasText(currentPassword) || isBcryptHash(currentPassword)) {
            return;
        }

        PasswordEncoder encoder = BeanUtil.getBean(PasswordEncoder.class);
        usuario.setPassword(encoder.encode(currentPassword));
    }

    private boolean isBcryptHash(String value) {
        return value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$");
    }
}
