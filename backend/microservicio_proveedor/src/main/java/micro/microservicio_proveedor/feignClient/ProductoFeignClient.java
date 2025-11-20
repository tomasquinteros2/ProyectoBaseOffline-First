package micro.microservicio_proveedor.feignClient;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.math.BigDecimal;

@FeignClient(name = "${feign.client.config.microservicio-producto.name}")
public interface ProductoFeignClient {

    @PutMapping("/productos/recalcular-por-proveedor/{proveedorId}")
    ResponseEntity<String> recalcularPreciosPorProveedor(@PathVariable Long proveedorId,@RequestParam BigDecimal nuevaCotizacion);
}
