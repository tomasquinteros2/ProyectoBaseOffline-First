package micro.microservicio_producto.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@ToString
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
