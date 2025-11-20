package micro.microservicio_producto.entities.DTO;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class  VentaItemResponseDTO {
    private Long id;
    private String productoDescripcion;
    private int cantidad;
    private BigDecimal precioUnitario;
}