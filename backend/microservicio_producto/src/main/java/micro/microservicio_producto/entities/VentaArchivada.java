package micro.microservicio_producto.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "venta_archivada")
@Getter
@Setter
public class VentaArchivada {

    @Id
    private Long id; // Usamos el mismo ID que la venta original, no es autogenerado.

    private String numeroComprobante;
    private LocalDateTime fechaVenta;
    private BigDecimal totalVenta;

    @OneToMany(mappedBy = "ventaArchivada", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VentaItemArchivado> items = new ArrayList<>();
}