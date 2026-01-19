package micro.microservicio_producto.entities;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
public class Venta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String numeroComprobante;
    private LocalDateTime fechaVenta;
    private BigDecimal totalVenta;

    @OneToMany(mappedBy = "venta", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<VentaItem> items = new ArrayList<>();

    /**
     * Setter personalizado que no reemplaza la instancia de la colección.
     * Mantener la misma lista evita la excepción de Hibernate con orphanRemoval.
     * Además asegura que cada VentaItem tenga la referencia a esta Venta.
     */
    public void setItems(List<VentaItem> newItems) {
        // limpiar la lista actual y reasignar elementos, preservando la instancia
        this.items.clear();
        if (newItems != null) {
            for (VentaItem it : newItems) {
                it.setVenta(this);
                this.items.add(it);
            }
        }
    }

    public void addItem(VentaItem item) {
        if (item == null) return;
        item.setVenta(this);
        this.items.add(item);
    }

    public void removeItem(VentaItem item) {
        if (item == null) return;
        item.setVenta(null);
        this.items.remove(item);
    }
}
