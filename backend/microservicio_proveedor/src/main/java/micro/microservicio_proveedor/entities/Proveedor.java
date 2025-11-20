package micro.microservicio_proveedor.entities;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Data
@NamedEntityGraph(
        name = "proveedor-with-razones-cuentas",
        attributeNodes = {
                @NamedAttributeNode(value = "razonesSociales", subgraph = "razones-subgraph")
        },
        subgraphs = {
                @NamedSubgraph(
                        name = "razones-subgraph",
                        attributeNodes = {
                                @NamedAttributeNode("cuentasBancarias")
                        }
                )
        }
)
public class Proveedor implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String nombre;

    @Column(length = 30)
    private String cuit;

    @Column(length = 60)
    private String calle;

    @Column(length = 20)
    private String altura;

    @Column(length = 10)
    private String codigoPostal;

    @Column(length = 100)
    private String provincia;

    @Column(length = 100)
    private String ciudad;

    @Column(length = 30)
    private String telefonoFijo;

    @Column(length = 30)
    private String celular;

    @Column(length = 30)
    private String nombreTransporte;

    @Column(length = 100)
    private String domicilioTransporte;

    @Column(length = 30)
    private String telefonoTransporte;

    @Column(length = 500)
    private String paginaWeb;

    @Column(length = 50)
    private String usuarioPagina;

    @Column(length = 50)
    private String contrasenaPagina;

    @Column(length = 100)
    private String responsableVentas1;

    @Column(length = 100)
    private String responsableVentas2;

    @Enumerated(EnumType.STRING)
    private CondicionVenta condicionVenta;

    @Enumerated(EnumType.STRING)
    private Moneda moneda;

    @Enumerated(EnumType.STRING)
    private TipoCotizacion tipoCotizacion;

    private BigDecimal valorCotizacionManual;

    @Column(length = 500)
    private String observaciones;

    @OneToMany(mappedBy = "proveedor", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference("proveedor-razonsocial")
    private Set<RazonSocial> razonesSociales = new HashSet<>();

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
