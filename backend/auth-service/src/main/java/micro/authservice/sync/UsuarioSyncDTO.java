package micro.authservice.sync;

import lombok.Data;
import java.util.Set;

@Data
public class UsuarioSyncDTO {
    private Long id;
    private String username;
    private String password;
    private Set<String> authorities;
    private String totpSecret;
    private boolean twoFactorEnabled;
    private boolean accountVerified;
}
