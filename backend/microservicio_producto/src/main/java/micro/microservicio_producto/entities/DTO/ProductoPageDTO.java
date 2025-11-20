package micro.microservicio_producto.entities.DTO;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class ProductoPageDTO {
    private Long id;
    private String codigoProducto;
    private String descripcion;
    private int cantidad;
    private BigDecimal precio_publico;
    private Long proveedorId;
    private Long tipoProductoId;
    private List<Long> productosRelacionadosIds;
    private boolean costoFijo;
    private BigDecimal costo_dolares;
    private BigDecimal costo_pesos;
    private BigDecimal porcentaje_ganancia;
    private BigDecimal iva;
    private BigDecimal resto;
    private BigDecimal precio_sin_redondear;
    private BigDecimal precio_publico_us;
    private BigDecimal precio_sin_iva;
    private LocalDate fecha_ingreso;
}