package micro.microservicio_producto.feignClients;

import micro.microservicio_producto.entities.DTO.TipoProductoDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "${feign.client.config.microservicio-tipo-producto.name}")
public interface TipoProductoClient {

    @GetMapping("/tiposproducto/{id}")
    ResponseEntity<TipoProductoDTO> getTipoProductoById(@PathVariable Long id);

    @GetMapping("/tiposproducto")
    List<TipoProductoDTO> getAllTiposProducto();
}