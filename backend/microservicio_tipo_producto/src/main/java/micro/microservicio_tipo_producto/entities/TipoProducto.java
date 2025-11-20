package micro.microservicio_tipo_producto.entities;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.AllArgsConstructor; // Añadir
import lombok.Getter;
import lombok.NoArgsConstructor; // Añadir
import lombok.Setter;
import lombok.ToString; // Añadir
import java.io.Serializable;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class TipoProducto implements Serializable{
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonProperty("id")
    private Long id;
    @Column(nullable = false, unique = true)
    @JsonProperty("nombre")
    private String nombre;
}