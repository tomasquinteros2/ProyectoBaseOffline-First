package micro.microservicio_producto.entities.DTO;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class VentaRequestDTO {
    private List<ProductoDTO> items;
}