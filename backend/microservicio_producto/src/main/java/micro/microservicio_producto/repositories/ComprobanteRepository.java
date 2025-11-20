// C:/Users/tomas/Desktop/pruebas/Ecopila/microservicio_producto/src/main/java/micro/microservicio_producto/repositories/ComprobanteRepository.java

package micro.microservicio_producto.repositories;

import feign.Param;
import micro.microservicio_producto.entities.NroComprobante;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ComprobanteRepository extends JpaRepository<NroComprobante, Long> {

    @Query("SELECT c FROM NroComprobante c WHERE c.fechaGeneracion < :fechaLimite")
    List<NroComprobante> findComprobantesAntiguos(LocalDateTime fechaLimite);

    @Query("SELECT n FROM NroComprobante n WHERE n.prefijo = :prefijo AND n.numero = :numero")
    Optional<NroComprobante> findByPrefijoAndNumero(
            @Param("prefijo") String prefijo,
            @Param("numero") int numero
    );

    @Modifying
    @Query("DELETE FROM NroComprobante c WHERE c.fechaGeneracion < :fechaLimite")
    int deleteByFechaGeneracionBefore(@Param("fechaLimite") LocalDateTime fechaLimite);
}