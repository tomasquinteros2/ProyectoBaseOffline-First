package micro.microservicio_producto.services;

import micro.microservicio_producto.entities.Venta;
import micro.microservicio_producto.entities.VentaArchivada;
import micro.microservicio_producto.entities.VentaItem;
import micro.microservicio_producto.entities.VentaItemArchivado;
import micro.microservicio_producto.repositories.VentaRepository;
import micro.microservicio_producto.repositories.VentaItemRepository;
import micro.microservicio_producto.repositories.VentaArchivadaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Profile("online")
public class VentaArchiveService {

    private static final Logger log = LoggerFactory.getLogger(VentaArchiveService.class);

    private final VentaRepository ventaRepository;
    private final VentaItemRepository ventaItemRepository;
    private final VentaArchivadaRepository ventaArchivadaRepository;

    public VentaArchiveService(VentaRepository ventaRepository, VentaItemRepository ventaItemRepository, VentaArchivadaRepository ventaArchivadaRepository) {
        this.ventaRepository = ventaRepository;
        this.ventaItemRepository = ventaItemRepository;
        this.ventaArchivadaRepository = ventaArchivadaRepository;
    }

    /**
     * Tarea programada para archivar las ventas del mes anterior.
     * Se ejecuta a las 3:00 AM del primer día de cada mes.
     */
    // El cron original es "0 0 3 1 * ?" (a las 3am del día 1 de cada mes)
    // Para testear, lo cambiamos para que se ejecute cada minuto.
    @Scheduled(cron = "0 0 3 1 * ?")
    @Transactional
    public void archivarVentasDelMesAnterior() {
        // --- LÓGICA ORIGINAL (para producción) ---
        YearMonth mesAnterior = YearMonth.now().minusMonths(1);
        LocalDate fechaInicio = mesAnterior.atDay(1);
        LocalDate fechaFin = mesAnterior.atEndOfMonth();
        log.info("--- Iniciando proceso de archivado de ventas para el período: {} a {} ---", fechaInicio, fechaFin);
        List<Venta> ventasParaArchivar = ventaRepository.findAllByFechaVentaBetween(fechaInicio.atStartOfDay(), fechaFin.atTime(23, 59, 59));

        // --- LÓGICA TEMPORAL (para testear) ---
        // Archiva todas las ventas que tengan más de 10 minutos de antigüedad.
        //LocalDateTime fechaLimite = LocalDateTime.now().minusMinutes(10);
        //log.info("--- (MODO TEST) Iniciando archivado de ventas anteriores a: {} ---", fechaLimite);
        //List<Venta> ventasParaArchivar = ventaRepository.findAllByFechaVentaBefore(fechaLimite);

        if (ventasParaArchivar.isEmpty()) {
            log.info("No se encontraron ventas para archivar en el período.");
            return;
        }

        log.info("Se encontraron {} ventas para archivar.", ventasParaArchivar.size());

        List<VentaArchivada> ventasConvertidas = ventasParaArchivar.stream()
                .map(this::convertirVentaAArchivada)
                .collect(Collectors.toList());

        // 1. Guardamos todo el lote en la tabla de archivo
        ventaArchivadaRepository.saveAll(ventasConvertidas);

        // 2. Si el guardado fue exitoso, eliminamos primero los hijos (VentaItem)
        List<VentaItem> itemsAEliminar = ventasParaArchivar.stream()
                .flatMap(venta -> venta.getItems().stream())
                .collect(Collectors.toList());

        if (!itemsAEliminar.isEmpty()) {
            ventaItemRepository.deleteAllInBatch(itemsAEliminar);
        }

        // 3. Y luego eliminamos los padres (Venta) de la tabla original
        ventaRepository.deleteAllInBatch(ventasParaArchivar);

        log.info("Se archivaron y eliminaron {} ventas de la tabla principal.", ventasParaArchivar.size());

        log.info("--- Proceso de archivado de ventas finalizado. ---");
    }

    private VentaArchivada convertirVentaAArchivada(Venta venta) {
        VentaArchivada archivada = new VentaArchivada();
        archivada.setId(venta.getId()); // Usamos el mismo ID
        archivada.setNumeroComprobante(venta.getNumeroComprobante());
        archivada.setFechaVenta(venta.getFechaVenta());
        archivada.setTotalVenta(venta.getTotalVenta());

        List<VentaItemArchivado> itemsArchivados = venta.getItems().stream()
                .map(item -> convertirItemAArchivado(item, archivada))
                .collect(Collectors.toList());
        archivada.setItems(itemsArchivados);
        return archivada;
    }

    private VentaItemArchivado convertirItemAArchivado(VentaItem item, VentaArchivada ventaArchivada) {
        VentaItemArchivado itemArchivado = new VentaItemArchivado();
        itemArchivado.setId(item.getId());
        itemArchivado.setProductoId(item.getProductoId());
        itemArchivado.setProductoDescripcion(item.getProductoDescripcion());
        itemArchivado.setCantidad(item.getCantidad());
        itemArchivado.setPrecioUnitario(item.getPrecioUnitario());
        itemArchivado.setVentaArchivada(ventaArchivada);
        return itemArchivado;
    }
}