package micro.microservicio_dolar.entities.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.time.LocalDateTime;

// Ignoramos propiedades que no necesitamos para evitar errores si la API añade nuevos campos
@JsonIgnoreProperties(ignoreUnknown = true)
public class DolarApiResponseDTO {
    private String casa;
    private String nombre;
    private BigDecimal compra;
    private BigDecimal venta;
    private LocalDateTime fechaActualizacion;

    // Getters y Setters para todos los campos
    public String getCasa() { return casa; }
    public void setCasa(String casa) { this.casa = casa; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public BigDecimal getCompra() { return compra; }
    public void setCompra(BigDecimal compra) { this.compra = compra; }
    public BigDecimal getVenta() { return venta; }
    public void setVenta(BigDecimal venta) { this.venta = venta; }
    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
    public void setFechaActualizacion(LocalDateTime fechaActualizacion) { this.fechaActualizacion = fechaActualizacion; }
}