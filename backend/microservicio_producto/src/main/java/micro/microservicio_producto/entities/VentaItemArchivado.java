package micro.microservicio_producto.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "venta_item_archivado")
@Getter
@Setter
public class VentaItemArchivado {

    @Id
    private Long id; // Mismo ID que el item original.

    private Long productoId;
    private String productoDescripcion;
    private int cantidad;
    private BigDecimal precioUnitario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venta_archivada_id")
    private VentaArchivada ventaArchivada;
}