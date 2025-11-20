package micro.authservice.dto;

import java.util.Set;

public class RegisterWith2FADTO {
    private String username;
    private String password;
    private Set<String> authorities;
    private String totpSecret; // Para TOTP
    private String verificationCode; // Código de verificación
}