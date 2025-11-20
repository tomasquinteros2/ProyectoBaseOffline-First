package micro.microservicio_producto.entities.DTO;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class VentaResponseDTO {
    private Long id;
    private String numeroComprobante;
    private LocalDateTime fechaVenta;
    private BigDecimal totalVenta;
    private List<VentaItemResponseDTO> items;
}