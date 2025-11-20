package micro.microservicio_producto.entities.DTO;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

public record ProductoRelacionadoResultadoDTO(
        Long id,
        String descripcion,
        String nombreProveedor,
        BigDecimal precioPublico,
        String nombreTipoProducto
) {}
