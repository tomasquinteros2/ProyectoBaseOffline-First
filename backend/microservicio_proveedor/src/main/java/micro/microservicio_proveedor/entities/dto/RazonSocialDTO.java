package micro.microservicio_proveedor.entities.dto;

import lombok.Builder;
import lombok.Data;

import java.io.Serializable;
import java.util.List;

@Data
@Builder
public class RazonSocialDTO implements Serializable {
    private Long id;
    private String nombre;
    private String descuentoSobreLista;
    private String descuentoSobreFactura;
    private List<CuentaBancariaDTO> cuentasBancarias;
}
