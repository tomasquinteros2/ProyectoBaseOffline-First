package micro.microservicio_proveedor.events;

import micro.microservicio_proveedor.feignClient.ProductoFeignClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.EventListener;

@Component
public class CotizacionCambiadaListener {

    private static final Logger log = LoggerFactory.getLogger(CotizacionCambiadaListener.class);
    private final ProductoFeignClient productoFeignClient;

    public CotizacionCambiadaListener(ProductoFeignClient productoFeignClient) {
        this.productoFeignClient = productoFeignClient;
    }

    @TransactionalEventListener
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleCotizacionCambiada(CotizacionCambiadaEvent event) {
        try {
            productoFeignClient.recalcularPreciosPorProveedor(
                    event.getProveedorId(),
                    event.getNuevaCotizacion()
            );
        } catch (Exception e) {
            log.error("Error al recalcular precios", e);
        }
    }
}
