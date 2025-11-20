package micro.microservicio_proveedor.entities.dto;

import lombok.Builder;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class ProveedorResponseDTO implements Serializable {
    private Long id;
    private String nombre;
    private String cuit;
    private String calle;
    private String altura;
    private String codigoPostal;
    private String provincia;
    private String ciudad;
    private String telefonoFijo;
    private String celular;
    private String nombreTransporte;
    private String domicilioTransporte;
    private String telefonoTransporte;
    private String paginaWeb;
    private String usuarioPagina;
    private String contrasenaPagina;
    private String responsableVentas1;
    private String responsableVentas2;
    private String condicionVenta;
    private String moneda;
    private String tipoCotizacion;
    private BigDecimal valorCotizacionManual;
    private String observaciones;
    private List<RazonSocialDTO> razonesSociales;
}
