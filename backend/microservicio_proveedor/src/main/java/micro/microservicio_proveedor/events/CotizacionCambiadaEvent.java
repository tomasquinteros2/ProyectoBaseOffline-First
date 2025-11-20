package micro.microservicio_proveedor.events;

import java.math.BigDecimal;

public class CotizacionCambiadaEvent {
    private final Long proveedorId;
    private final BigDecimal nuevaCotizacion; // NUEVO

    public CotizacionCambiadaEvent(Long proveedorId, BigDecimal nuevaCotizacion) {
        this.proveedorId = proveedorId;
        this.nuevaCotizacion = nuevaCotizacion;
    }
    public Long getProveedorId() {
        return proveedorId;
    }
    public BigDecimal getNuevaCotizacion() {
        return nuevaCotizacion;
    }
}
