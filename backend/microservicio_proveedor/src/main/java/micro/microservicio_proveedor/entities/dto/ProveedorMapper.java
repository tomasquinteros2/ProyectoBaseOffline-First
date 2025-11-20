package micro.microservicio_proveedor.entities.dto;

import micro.microservicio_proveedor.entities.*;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class ProveedorMapper {

    public static ProveedorResponseDTO toDTO(Proveedor p) {
        if (p == null) return null;
        return ProveedorResponseDTO.builder()
                .id(p.getId())
                .nombre(p.getNombre())
                .cuit(p.getCuit())
                .calle(p.getCalle())
                .altura(p.getAltura())
                .codigoPostal(p.getCodigoPostal())
                .provincia(p.getProvincia())
                .ciudad(p.getCiudad())
                .telefonoFijo(p.getTelefonoFijo())
                .celular(p.getCelular())
                .nombreTransporte(p.getNombreTransporte())
                .domicilioTransporte(p.getDomicilioTransporte())
                .telefonoTransporte(p.getTelefonoTransporte())
                .paginaWeb(p.getPaginaWeb())
                .usuarioPagina(p.getUsuarioPagina())
                .contrasenaPagina(p.getContrasenaPagina())
                .responsableVentas1(p.getResponsableVentas1())
                .responsableVentas2(p.getResponsableVentas2())
                .condicionVenta(p.getCondicionVenta() != null ? p.getCondicionVenta().name() : null)
                .moneda(p.getMoneda() != null ? p.getMoneda().name() : null)
                .tipoCotizacion(p.getTipoCotizacion() != null ? p.getTipoCotizacion().name() : null)
                .valorCotizacionManual(p.getValorCotizacionManual())
                .observaciones(p.getObservaciones())
                .razonesSociales(mapRazones(p))
                .build();
    }

    private static List<RazonSocialDTO> mapRazones(Proveedor p) {
        if (p.getRazonesSociales() == null || p.getRazonesSociales().isEmpty()) return Collections.emptyList();
        return p.getRazonesSociales().stream()
                .map(ProveedorMapper::toDTO)
                .collect(Collectors.toList());
    }

    private static RazonSocialDTO toDTO(RazonSocial rs) {
        if (rs == null) return null;
        return RazonSocialDTO.builder()
                .id(rs.getId())
                .nombre(rs.getNombre())
                .descuentoSobreLista(rs.getDescuentoSobreLista())
                .descuentoSobreFactura(rs.getDescuentoSobreFactura())
                .cuentasBancarias(
                        rs.getCuentasBancarias() == null ? Collections.emptyList()
                                : rs.getCuentasBancarias().stream()
                                .map(ProveedorMapper::toDTO)
                                .collect(Collectors.toList())
                )
                .build();
    }

    private static CuentaBancariaDTO toDTO(CuentaBancaria cb) {
        if (cb == null) return null;
        return CuentaBancariaDTO.builder()
                .id(cb.getId())
                .cbu(cb.getCbu())
                .alias(cb.getAlias())
                .tipoCuenta(cb.getTipoCuenta() != null ? cb.getTipoCuenta().name() : null)
                .numeroCuenta(cb.getNumeroCuenta())
                .titular(cb.getTitular())
                .build();
    }
}
