package micro.microservicio_producto.feignClients;

import micro.microservicio_producto.entities.DTO.ProveedorDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "${feign.client.config.microservicio-proveedor.name}")
public interface ProveedorClient {

    @GetMapping("/proveedores/{id}")
    ResponseEntity<ProveedorDTO> getProveedorById(@PathVariable Long id);

    @GetMapping("/proveedores")
    List<ProveedorDTO> getAllProveedores();
}