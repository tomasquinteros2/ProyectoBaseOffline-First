package micro.authservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginDTO {

    @NotBlank(message = "El nombre de usuario es un campo requerido.")
    private String username;

    @NotBlank(message = "La contraseña es un campo requerido.")
    private String password;
}