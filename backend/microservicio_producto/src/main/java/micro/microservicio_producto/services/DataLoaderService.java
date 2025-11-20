package micro.microservicio_producto.services;

import jakarta.transaction.Transactional;
import micro.microservicio_producto.entities.Producto;
import micro.microservicio_producto.feignClients.DolarFeignClient;
import micro.microservicio_producto.repositories.ProductoRepository;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class DataLoaderService {

    private static final Logger log = LoggerFactory.getLogger(DataLoaderService.class);

    private final ProductoRepository productoRepository;
    private final DolarFeignClient dolarFeignClient;

    @Value("${app.dolar.default-value:1000.00}")
    private String dolarDefaultValue;

    public DataLoaderService(ProductoRepository productoRepository, DolarFeignClient dolarFeignClient) {
        this.productoRepository = productoRepository;
        this.dolarFeignClient = dolarFeignClient;
    }

    @Transactional
    public int cargarDatosDesdeCSV() {
        if (productoRepository.count() > 0) {
            log.warn("La tabla de productos no está vacía. Omitiendo carga de datos desde CSV.");
            return 0; // No se cargó nada
        }

        log.info("Iniciando carga masiva de datos desde CSV...");
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        BigDecimal valorDolar = obtenerValorDolar();
        List<Producto> productosParaGuardar = new ArrayList<>();

        try (InputStream inputStream = getClass().getResourceAsStream("/BFT - copia.csv");
             BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream));
             CSVParser datosProducto = new CSVParser(reader, CSVFormat.DEFAULT.withHeader())) {

            for (CSVRecord record : datosProducto) {
                Producto p = crearProductoDesdeCSV(record, valorDolar, formatter);
                productosParaGuardar.add(p);
            }

            productoRepository.saveAll(productosParaGuardar);
            log.info("Carga de datos desde CSV finalizada. {} productos guardados.", productosParaGuardar.size());
            return productosParaGuardar.size();

        } catch (Exception e) {
            log.error("Error crítico durante la carga de datos desde CSV", e);
            // Re-lanzamos la excepción para que el controlador la maneje y muestre un error claro.
            throw new RuntimeException("Error al leer o procesar el archivo CSV.", e);
        }
    }

    private Producto crearProductoDesdeCSV(CSVRecord record, BigDecimal valorDolar, DateTimeFormatter formatter) {
        Producto p = new Producto();
        p.setCodigoProducto(record.get("CODIGO"));
        p.setIva(new BigDecimal(record.get("IVA")));
        p.setDescripcion(record.get("DESCRIPCION"));

        BigDecimal precioPublicoUS = new BigDecimal(record.get("PUBLICO US").replace("$", "").trim());
        p.setPrecio_publico_us(precioPublicoUS);

        if (!"#REF!".equals(record.get("S/RED"))) {
            p.setPrecio_sin_redondear(new BigDecimal(record.get("S/RED")));
        } else {
            p.setPrecio_sin_redondear(precioPublicoUS.multiply(valorDolar));
        }

        if (!"#REF!".equals(record.get("PUBLICO"))) {
            p.setPrecio_publico(new BigDecimal(record.get("PUBLICO")));
        } else {
            BigDecimal resto = new BigDecimal(record.get("RES"));
            BigDecimal precioCalculado = precioPublicoUS.multiply(valorDolar);
            // Redondeo hacia arriba al múltiplo de 'resto' más cercano
            BigDecimal precioRedondeado = precioCalculado.divide(resto, 0, RoundingMode.CEILING).multiply(resto);
            p.setPrecio_publico(precioRedondeado);
        }

        if (!"#REF!".equals(record.get("RES"))) {
            p.setResto(new BigDecimal(record.get("RES")));
        }

        p.setPorcentaje_ganancia(new BigDecimal(record.get("GANANCIA")));
        p.setFecha_ingreso(LocalDate.parse(record.get("FECHA ING"), formatter));
        p.setCantidad(1);

        // Lógica de costos
        if (record.isMapped("COSTO US") && !record.get("COSTO US").isBlank()) {
            p.setCosto_dolares(new BigDecimal(record.get("COSTO US").replace("$", "").trim()));
        } else if (record.isMapped("COSTO PESOS") && !record.get("COSTO PESOS").isBlank()) {
            BigDecimal costoPesos = new BigDecimal(record.get("COSTO PESOS").replace("$", "").trim());
            p.setCosto_dolares(costoPesos.divide(valorDolar, 4, RoundingMode.HALF_UP));
        }

        if (record.isMapped("COSTO PESOS") && !record.get("COSTO PESOS").isBlank()) {
            p.setCosto_pesos(new BigDecimal(record.get("COSTO PESOS").replace("$", "").trim()));
        } else if (p.getCosto_dolares() != null) {
            p.setCosto_pesos(p.getCosto_dolares().multiply(valorDolar));
        }

        p.setPrecio_sin_iva(new BigDecimal(record.get("US S/IVA").replace("$", "").trim()));

        // Asignar IDs de proveedor y tipo de producto si existen en el CSV
        if (record.isMapped("PROVEEDOR_ID") && !record.get("PROVEEDOR_ID").isBlank()) {
            p.setProveedorId(Long.parseLong(record.get("PROVEEDOR_ID")));
        }
        if (record.isMapped("TIPO_PRODUCTO_ID") && !record.get("TIPO_PRODUCTO_ID").isBlank()) {
            p.setTipoProductoId(Long.parseLong(record.get("TIPO_PRODUCTO_ID")));
        }

        return p;
    }

    private BigDecimal obtenerValorDolar() {
        try {
            ResponseEntity<BigDecimal> response = dolarFeignClient.getValorDolar(1);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
            log.error("Respuesta no exitosa del servicio de dólar: {}. Usando valor por defecto.", response.getStatusCode());
            return new BigDecimal(dolarDefaultValue);
        } catch (Exception e) {
            log.error("No se pudo obtener el valor del dólar del microservicio. Usando valor por defecto: {}. Causa: {}", dolarDefaultValue, e.getMessage());
            return new BigDecimal(dolarDefaultValue);
        }
    }
}