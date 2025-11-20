package micro.authservice.dto;

import jakarta.validation.constraints.NotBlank;

public class InviteRequestDTO {
    @NotBlank(message = "El nombre del solicitante es requerido")
    private String requestedUsername;

    @NotBlank(message = "El rol solicitado es requerido")
    private String requestedRole;

    public String getRequestedUsername() {
        return requestedUsername;
    }

    public void setRequestedUsername(String requestedUsername) {
        this.requestedUsername = requestedUsername;
    }

    public String getRequestedRole() {
        return requestedRole;
    }

    public void setRequestedRole(String requestedRole) {
        this.requestedRole = requestedRole;
    }
}
