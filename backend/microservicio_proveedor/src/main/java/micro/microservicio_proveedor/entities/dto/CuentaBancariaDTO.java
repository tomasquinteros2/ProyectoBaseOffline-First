package micro.microservicio_proveedor.entities.dto;

import lombok.Builder;
import lombok.Data;

import java.io.Serializable;

@Data
@Builder
public class CuentaBancariaDTO implements Serializable {
    private Long id;
    private String cbu;
    private String alias;
    private String tipoCuenta;
    private String numeroCuenta;
    private String titular;
}
