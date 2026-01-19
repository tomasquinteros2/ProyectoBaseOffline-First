package micro.microservicio_producto.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@ToString
@JsonIgnoreProperties(ignoreUnknown = true)
public class NroComprobante {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String prefijo;

    @Column(nullable = false)
    private int numero;

    @Lob
    private String contenidoHtml;

    private LocalDateTime fechaGeneracion;

    public String getNumeroComprobante(){
        return prefijo + numero;
    }

}
