package micro.microservicio_tipo_producto.entities;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import micro.microservicio_tipo_producto.sync.OneDriveListener;
import lombok.AllArgsConstructor; // Añadir
import lombok.Getter;
import lombok.NoArgsConstructor; // Añadir
import lombok.Setter;
import lombok.ToString; // Añadir
import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@EntityListeners(OneDriveListener.class)
public class TipoProducto implements Serializable{
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonProperty("id")
    private Long id;
    @Column(nullable = false, unique = true)
    @JsonProperty("nombre")
    private String nombre;

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