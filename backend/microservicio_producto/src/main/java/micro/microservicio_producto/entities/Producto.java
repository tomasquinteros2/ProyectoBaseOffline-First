package micro.microservicio_producto.entities;

import com.fasterxml.jackson.annotation.*;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Entity
@Getter
@Setter
@ToString(exclude = {"productosRelacionados", "relacionadoCon"})
@JsonIdentityInfo(
        generator = ObjectIdGenerators.PropertyGenerator.class,
        property = "id"
)
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "producto_seq")
    @SequenceGenerator(
            name = "producto_seq",
            sequenceName = "producto_id_seq",
            allocationSize = 50
    )
    private Long id;

    @Column(name = "codigo_producto",nullable = true, unique = false)
    private String codigoProducto;

    @Column
    private String descripcion;

    @Column
    private int cantidad;

    @Column(precision = 19, scale = 4)
    private BigDecimal iva;

    @Column(precision = 19, scale = 4)
    private BigDecimal precio_publico;

    @Column(precision = 19, scale = 4)
    private BigDecimal resto;

    @Column(precision = 19, scale = 4)
    private BigDecimal precio_sin_redondear;

    @Column(precision = 19, scale = 4)
    private BigDecimal precio_publico_us;

    @Column(precision = 19, scale = 4)
    private BigDecimal porcentaje_ganancia;

    @Column(precision = 19, scale = 4,nullable = true)
    private BigDecimal costo_dolares;

    @Column(precision = 19, scale = 4,nullable = false)
    private BigDecimal costo_pesos;

    @Column(precision = 19, scale = 4)
    private BigDecimal precio_sin_iva;

    @Column(nullable = false)
    @ColumnDefault("false")
    private boolean costoFijo;

    @Column
    private LocalDate fecha_ingreso;

    @Column
    private Long proveedorId;

    @Column
    private Long tipoProductoId;

    @ManyToMany(fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
            name = "productos_relacionados",
            joinColumns = @JoinColumn(name = "producto_id"),
            inverseJoinColumns = @JoinColumn(name = "producto_relacionado_id")
    )
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JsonBackReference
    private Set<Producto> productosRelacionados = new HashSet<>();

    @JsonIgnore
    @ManyToMany(mappedBy = "productosRelacionados")
    private Set<Producto> relacionadoCon = new HashSet<>();

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.codigoProducto == null || this.codigoProducto.trim().isEmpty()) {
            this.codigoProducto = "PROD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }

        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @JsonProperty("productosRelacionadosIds")
    public List<Long> getProductosRelacionadosIds() {
        if (productosRelacionados == null) {
            return List.of();
        }
        return productosRelacionados.stream()
                .map(Producto::getId)
                .collect(Collectors.toList());
    }

    public void agregarRelacion(Producto producto) {
        this.productosRelacionados.add(producto);
        producto.getProductosRelacionados().add(this);
    }

    public void eliminarRelacion(Producto producto) {
        this.productosRelacionados.remove(producto);
        producto.getProductosRelacionados().remove(this);
    }


}
