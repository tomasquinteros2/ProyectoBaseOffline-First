package micro.microservicio_proveedor.entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.io.Serializable;
import java.util.Objects;

@Entity
@Getter
@Setter
@ToString(exclude = {"razonSocial"})
public class CuentaBancaria implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 22)
    private String cbu;

    @Column(length = 30)
    private String alias;

    @Enumerated(EnumType.STRING)
    private TipoCuenta tipoCuenta;

    @Column(length = 30)
    private String numeroCuenta;

    @Column(length = 50)
    private String titular;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "razon_social_id")
    @JsonBackReference
    private RazonSocial razonSocial;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof CuentaBancaria)) return false;
        CuentaBancaria that = (CuentaBancaria) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
