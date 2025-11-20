package micro.microservicio_producto.web.dto;

import java.time.LocalDateTime;

public class SyncStatusDTO {
    private boolean sincronizado;
    private LocalDateTime ultimaSincronizacion;
    private String mensaje;
    private Long registrosPendientes;

    public SyncStatusDTO() {
    }

    public SyncStatusDTO(boolean sincronizado, LocalDateTime ultimaSincronizacion, String mensaje, Long registrosPendientes) {
        this.sincronizado = sincronizado;
        this.ultimaSincronizacion = ultimaSincronizacion;
        this.mensaje = mensaje;
        this.registrosPendientes = registrosPendientes;
    }

    // Getters y Setters
    public boolean isSincronizado() {
        return sincronizado;
    }

    public void setSincronizado(boolean sincronizado) {
        this.sincronizado = sincronizado;
    }

    public LocalDateTime getUltimaSincronizacion() {
        return ultimaSincronizacion;
    }

    public void setUltimaSincronizacion(LocalDateTime ultimaSincronizacion) {
        this.ultimaSincronizacion = ultimaSincronizacion;
    }

    public String getMensaje() {
        return mensaje;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }

    public Long getRegistrosPendientes() {
        return registrosPendientes;
    }

    public void setRegistrosPendientes(Long registrosPendientes) {
        this.registrosPendientes = registrosPendientes;
    }
}
