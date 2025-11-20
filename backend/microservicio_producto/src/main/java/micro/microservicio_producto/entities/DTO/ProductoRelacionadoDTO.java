package micro.microservicio_producto.entities.DTO;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProductoRelacionadoDTO {
    private Long productoId;
    private Long productoRelacionadoId;

}