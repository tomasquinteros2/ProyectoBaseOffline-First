package micro.microservicio_producto.services;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.FeignException;
import jakarta.persistence.criteria.Predicate;
import micro.microservicio_producto.entities.DTO.*;
import micro.microservicio_producto.entities.Producto;
import micro.microservicio_producto.exceptions.BusinessLogicException;
import micro.microservicio_producto.exceptions.ResourceNotFoundException;
import micro.microservicio_producto.feignClients.DolarFeignClient;
import micro.microservicio_producto.feignClients.ProveedorClient;
import micro.microservicio_producto.feignClients.TipoProductoClient;
import micro.microservicio_producto.repositories.ProductoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class ProductoService {

    private static final Logger log = LoggerFactory.getLogger(ProductoService.class);

    private final ProductoRepository productoRepository;
    private final DolarFeignClient dolarFeignClient;
    private final TipoProductoClient tipoProductoClient;
    private final ProveedorClient proveedorClient;
    private final ObjectMapper objectMapper;

    @PersistenceContext
    private EntityManager em;

    private static final java.math.BigDecimal RESTO_DEFAULT = new java.math.BigDecimal("100");

    @Value("${app.dolar.default-value:1200.00}")
    private String dolarDefaultValue;

    public ProductoService(ProductoRepository productoRepository,
                           DolarFeignClient dolarFeignClient,
                           TipoProductoClient tipoProductoClient,
                           ProveedorClient proveedorClient) {
        this.productoRepository = productoRepository;
        this.dolarFeignClient = dolarFeignClient;
        this.tipoProductoClient = tipoProductoClient;
        this.proveedorClient = proveedorClient;
        this.objectMapper = new ObjectMapper();
    }

    private Page<ProductoPageDTO> convertToPageDTO(Page<Producto> productoPage, Pageable pageable) {
        List<Long> productoIds = productoPage.stream().map(Producto::getId).toList();
        List<Object[]> relaciones = productoRepository.findRelacionadosIdsByProductoIds(productoIds);

        Map<Long, List<Long>> relacionadosMap = new HashMap<>();
        for (Object[] row : relaciones) {
            Long prodId = ((Number) row[0]).longValue();
            Long relId = ((Number) row[1]).longValue();
            relacionadosMap.computeIfAbsent(prodId, k -> new ArrayList<>()).add(relId);
        }

        List<ProductoPageDTO> dtos = productoPage.stream().map(producto -> {
            ProductoPageDTO dto = new ProductoPageDTO();
            dto.setId(producto.getId());
            dto.setCodigoProducto(producto.getCodigoProducto());
            dto.setDescripcion(producto.getDescripcion());
            dto.setCantidad(producto.getCantidad());
            dto.setPrecio_publico(producto.getPrecio_publico());
            dto.setProveedorId(producto.getProveedorId());
            dto.setTipoProductoId(producto.getTipoProductoId());
            dto.setProductosRelacionadosIds(relacionadosMap.getOrDefault(producto.getId(), List.of()));
            dto.setCostoFijo(producto.isCostoFijo());
            dto.setCosto_dolares(producto.getCosto_dolares());
            dto.setCosto_pesos(producto.getCosto_pesos());
            dto.setPorcentaje_ganancia(producto.getPorcentaje_ganancia());
            dto.setIva(producto.getIva());
            dto.setResto(producto.getResto());
            dto.setPrecio_sin_redondear(producto.getPrecio_sin_redondear());
            dto.setPrecio_publico_us(producto.getPrecio_publico_us());
            dto.setPrecio_sin_iva(producto.getPrecio_sin_iva());
            dto.setFecha_ingreso(producto.getFecha_ingreso());
            return dto;
        }).toList();

        return new PageImpl<>(dtos, pageable, productoPage.getTotalElements());
    }

    @Transactional(readOnly = true)
    public Page<ProductoPageDTO> findAllPaginatedAndFiltered(Long id,
                                                             String codigo_producto,
                                                             String descripcion,
                                                             Long proveedorId,
                                                             Long tipoId,
                                                             Pageable pageable) {
        Specification<Producto> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Crear predicados de búsqueda de texto
            if ((id != null) || (codigo_producto != null && !codigo_producto.trim().isEmpty()) ||
                    (descripcion != null && !descripcion.trim().isEmpty())) {

                List<Predicate> searchPredicates = new ArrayList<>();

                if (id != null) {
                    searchPredicates.add(criteriaBuilder.like(
                            criteriaBuilder.lower(root.get("id").as(String.class)),
                            "%" + id.toString().toLowerCase() + "%"
                    ));
                }

                if (codigo_producto != null && !codigo_producto.trim().isEmpty()) {
                    searchPredicates.add(criteriaBuilder.like(
                            criteriaBuilder.lower(root.get("codigoProducto")),
                            "%" + codigo_producto.toLowerCase() + "%"
                    ));
                }

                if (descripcion != null && !descripcion.trim().isEmpty()) {
                    searchPredicates.add(criteriaBuilder.like(
                            criteriaBuilder.lower(root.get("descripcion")),
                            "%" + descripcion.toLowerCase() + "%"
                    ));
                }

                // Usar OR para buscar en cualquiera de los campos
                predicates.add(criteriaBuilder.or(searchPredicates.toArray(new Predicate[0])));
            }

            if (proveedorId != null) {
                predicates.add(criteriaBuilder.equal(root.get("proveedorId"), proveedorId));
            }
            if (tipoId != null) {
                predicates.add(criteriaBuilder.equal(root.get("tipoProductoId"), tipoId));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };

        Page<Producto> productoPage = productoRepository.findAll(spec, pageable);
        return convertToPageDTO(productoPage, pageable);
    }

    public List<Producto> findAll() {
        return productoRepository.findAll();
    }

    public Producto findById(Long id) {
        return productoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con ID: " + id));
    }

    public List<Producto> findByDesc(String desc) {
        return productoRepository.findByDesc(desc)
                .orElseThrow(() -> new ResourceNotFoundException("No se encontraron productos con la descripción: " + desc));
    }

    public List<Producto> findByTipoProducto(Long id) {
        return productoRepository.findByTipoProductoId(id).orElse(List.of());
    }

    // --- MÉTODOS DE ESCRITURA Y LÓGICA DE NEGOCIO ---

    @Transactional
    public Producto save(Producto incomingProduct) {
        if (incomingProduct.getCodigoProducto() == null || incomingProduct.getCodigoProducto().trim().isEmpty()) {
            incomingProduct.setCodigoProducto("PROD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }

        Optional<Producto> existingProductOpt = productoRepository.findByCodigoProductoAndProveedorId(
                incomingProduct.getCodigoProducto(),
                incomingProduct.getProveedorId()
        );

        Producto productToSave = existingProductOpt.orElse(incomingProduct);

        if (existingProductOpt.isPresent()) {
            log.info("Producto con código {} y proveedor {} ya existe. Actualizando.",
                    incomingProduct.getCodigoProducto(), incomingProduct.getProveedorId());
            productToSave.setDescripcion(incomingProduct.getDescripcion());
            productToSave.setPrecio_sin_iva(incomingProduct.getPrecio_sin_iva());
            productToSave.setPorcentaje_ganancia(incomingProduct.getPorcentaje_ganancia());
            productToSave.setIva(incomingProduct.getIva());
            productToSave.setCantidad(productToSave.getCantidad() + incomingProduct.getCantidad());
        } else {
            log.info("Creando nuevo producto con código {}", incomingProduct.getCodigoProducto());
            productToSave.setCantidad(incomingProduct.getCantidad() > 0 ? incomingProduct.getCantidad() : 1);
        }

        productToSave.setFecha_ingreso(LocalDate.now());
        validarRelaciones(productToSave.getTipoProductoId(), productToSave.getProveedorId());

        if (!productToSave.isCostoFijo()) {
            BigDecimal valorDolar = obtenerValorDolarParaProducto(productToSave.getProveedorId());
            recalculatePrices(productToSave, valorDolar);
        } else {
            calculateFixedCostPrices(productToSave);
        }

        return productoRepository.save(productToSave);
    }

    @Transactional
    public Producto update(Long id, Producto productoDetails) {
        Producto productoExistente = findById(id);
        updateProductoFields(productoExistente, productoDetails);

        if (!productoExistente.isCostoFijo()) {
            // Obtener la cotización del PROVEEDOR del producto, no la oficial
            BigDecimal valorDolar = obtenerValorDolarParaProducto(productoExistente.getProveedorId());
            recalculatePrices(productoExistente, valorDolar);
        } else {
            calculateFixedCostPrices(productoExistente);
        }

        return productoRepository.save(productoExistente);
    }

    @Transactional
    public void delete(Long id) {
        if (!productoRepository.existsById(id)) {
            throw new ResourceNotFoundException("No se puede eliminar. Producto no encontrado con ID: " + id);
        }
        productoRepository.eliminarRelaciones(id);
        productoRepository.deleteById(id);
    }

    @Transactional
    public void descontarProductos(List<ProductoDTO> productos) {
        if (productos == null || productos.isEmpty()) {
            throw new IllegalArgumentException("La lista de productos a descontar no puede estar vacía.");
        }
        for (ProductoDTO productoDTO : productos) {
            int updatedRows = productoRepository.descontar(productoDTO.getId(), productoDTO.getCantidad());
            if (updatedRows == 0) {
                throw new ResourceNotFoundException("No se pudo descontar el producto con ID " + productoDTO.getId() + " porque no fue encontrado.");
            }
        }
    }

    @Transactional
    public void agregarRelacion(ProductoRelacionadoDTO dto) {
        Producto producto1 = findById(dto.getProductoId());
        Producto producto2 = findById(dto.getProductoRelacionadoId());
        if (!Objects.equals(producto1.getTipoProductoId(), producto2.getTipoProductoId())) {
            throw new BusinessLogicException("Los productos deben ser del mismo tipo para poder relacionarlos.");
        }
        producto1.agregarRelacion(producto2);
        Producto productoGuardado = productoRepository.save(producto1);
    }
    @Transactional
    public void eliminarRelacion(ProductoRelacionadoDTO dto) {
        Producto productoPrincipal = findById(dto.getProductoId());
        Producto productoARemover = findById(dto.getProductoRelacionadoId());

        productoPrincipal.eliminarRelacion(productoARemover);

        log.info("Relación entre producto ID {} y producto ID {} eliminada.", dto.getProductoId(), dto.getProductoRelacionadoId());
    }
    private BigDecimal obtenerValorDolarParaProducto(Long proveedorId) {
        if (proveedorId == null) {
            return obtenerValorDolar();
        }

        try {
            ProveedorDTO proveedor = proveedorClient.getProveedorById(proveedorId).getBody();
            if (proveedor != null
                    && proveedor.getValorCotizacionManual() != null
                    && proveedor.getValorCotizacionManual().compareTo(BigDecimal.ZERO) > 0) {
                log.info("Usando cotización manual {} del proveedor ID: {}",
                        proveedor.getValorCotizacionManual(), proveedorId);
                return proveedor.getValorCotizacionManual();
            }
        } catch (Exception e) {
            log.warn("No se pudo obtener cotización del proveedor ID: {}. Usando oficial", proveedorId);
        }

        return obtenerValorDolar();
    }
    @Transactional(readOnly = true)
    public List<ProductoRelacionadoResultadoDTO> obtenerRelacionadosConProveedor(Long productoId) {
        Producto producto = findById(productoId);
        Set<Producto> relacionados = producto.getProductosRelacionados();
        List<ProductoRelacionadoResultadoDTO> dtos = new ArrayList<>();
        for (Producto p : relacionados) {
            try {
                ProveedorDTO proveedor = proveedorClient.getProveedorById(p.getProveedorId()).getBody();
                TipoProductoDTO tipo = tipoProductoClient.getTipoProductoById(p.getTipoProductoId()).getBody();
                dtos.add(new ProductoRelacionadoResultadoDTO(p.getId(), p.getDescripcion(), proveedor.getNombre(), p.getPrecio_publico(), tipo.getNombre()));
            } catch (FeignException e) {
                log.error("No se pudo obtener información completa para el producto relacionado ID: {}. Causa: {}", p.getId(), e.getMessage());
            }
        }
        return dtos;
    }

    @Transactional
    @Profile("online")
    @ConditionalOnProperty(name = "app.pricing.auto-update.enabled", havingValue = "true", matchIfMissing = true)
    @Scheduled(cron = "0 0 */3 * * *")
    public void actualizarPreciosProgramado() {
        log.info("--- Iniciando tarea programada: Actualización de precios ---");
        BigDecimal valorDolarGeneral = obtenerValorDolar();
        long productosActualizados = 0;

        List<Producto> productosAActualizar = productoRepository.findAllByCostoFijoIsFalse();
        Map<Long, ProveedorDTO> proveedoresCache = new HashMap<>();

        for (Producto producto : productosAActualizar) {
            BigDecimal valorDolarProducto = valorDolarGeneral;

            if (producto.getProveedorId() != null) {
                ProveedorDTO proveedor = proveedoresCache.computeIfAbsent(producto.getProveedorId(), id -> {
                    try {
                        return proveedorClient.getProveedorById(id).getBody();
                    } catch (FeignException e) {
                        log.error("No se pudo obtener el proveedor con ID {}. Causa: {}", id, e.getMessage());
                        return null;
                    }
                });

                if (proveedor != null && proveedor.getValorCotizacionManual() != null && proveedor.getValorCotizacionManual().compareTo(BigDecimal.ZERO) > 0) {
                    log.info("Usando cotización manual del proveedor ID {} para el producto ID {}", proveedor.getId(), proveedor.getValorCotizacionManual());
                    valorDolarProducto = proveedor.getValorCotizacionManual();
                }
            }
            log.info("Recalculando precios para producto ID {} con valor de dólar: {}", producto.getId(), valorDolarProducto);
            recalculatePrices(producto, valorDolarProducto);
            productosActualizados++;
        }

        if (!productosAActualizar.isEmpty()) {
            productoRepository.saveAll(productosAActualizar);
        }

        log.info("--- Finalizada tarea programada: {} productos actualizados. Valor de dólar general: {} ---",
                productosActualizados, valorDolarGeneral);
    }

    @Transactional
    public void recalcularPreciosPorProveedor(Long proveedorId,BigDecimal valorDolar) {
        log.info("Recalculando con cotización forzada: {}", valorDolar);

        List<Producto> productos = productoRepository.findAll(
                (root, query, cb) -> cb.and(
                        cb.equal(root.get("proveedorId"), proveedorId),
                        cb.equal(root.get("costoFijo"), false)
                )
        );

        if (productos.isEmpty()) {
            log.info("No hay productos sin costo fijo para el proveedor ID: {}", proveedorId);
            return;
        }

        final BigDecimal valorDolarFinal = valorDolar;
        productos.forEach(producto -> {
            log.debug("Recalculando producto ID: {} con dólar: {}", producto.getId(), valorDolarFinal);
            recalculatePrices(producto, valorDolarFinal);
        });

        productoRepository.saveAll(productos);
        log.info("Recalculados {} productos del proveedor ID: {} con cotización: {}",
                productos.size(), proveedorId, valorDolarFinal);
    }

    private void calculateFixedCostPrices(Producto producto) {
        if (producto.getCosto_pesos() == null || producto.getPorcentaje_ganancia() == null) {
            log.warn("Producto ID {} es costo fijo pero falta costo_pesos o porcentaje_ganancia", producto.getId());
            return;
        }

        BigDecimal cien = new BigDecimal("100");
        BigDecimal porcentajeGanancia = producto.getPorcentaje_ganancia().divide(cien, 4, RoundingMode.HALF_UP);

        BigDecimal precioSinRedondear = producto.getCosto_pesos().multiply(BigDecimal.ONE.add(porcentajeGanancia));
        producto.setPrecio_sin_redondear(precioSinRedondear.setScale(4, RoundingMode.HALF_UP));

        BigDecimal resto = producto.getResto() != null && producto.getResto().compareTo(BigDecimal.ZERO) > 0
                ? producto.getResto()
                : RESTO_DEFAULT;;
        BigDecimal precioPublico = precioSinRedondear.divide(resto, 0, RoundingMode.CEILING).multiply(resto);
        producto.setPrecio_publico(precioPublico.setScale(2, RoundingMode.HALF_UP));
    }

    private void recalculatePrices(Producto producto, BigDecimal valorDolar) {
        if (producto.getPrecio_sin_iva() == null || producto.getIva() == null || producto.getPorcentaje_ganancia() == null) {
            log.warn("Producto ID {} no tiene los datos base (precio sin iva, iva, ganancia) para calcular precios. Saltando...", producto.getId());
            return;
        }
        BigDecimal cien = new BigDecimal("100");
        BigDecimal porcentajeGanancia = producto.getPorcentaje_ganancia().divide(cien, 4, RoundingMode.HALF_UP);
        BigDecimal costoDolares = producto.getPrecio_sin_iva().multiply(BigDecimal.ONE.add(producto.getIva()));
        producto.setCosto_dolares(costoDolares.setScale(4, RoundingMode.HALF_UP));
        BigDecimal costoPesos = costoDolares.multiply(valorDolar);
        producto.setCosto_pesos(costoPesos.setScale(4, RoundingMode.HALF_UP));
        BigDecimal precioPublicoUs = costoDolares.multiply(BigDecimal.ONE.add(porcentajeGanancia));
        producto.setPrecio_publico_us(precioPublicoUs.setScale(4, RoundingMode.HALF_UP));
        BigDecimal precioSinRedondear = precioPublicoUs.multiply(valorDolar);
        producto.setPrecio_sin_redondear(precioSinRedondear.setScale(4, RoundingMode.HALF_UP));
        BigDecimal resto = producto.getResto() != null && producto.getResto().compareTo(BigDecimal.ZERO) > 0
                ? producto.getResto()
                : RESTO_DEFAULT;;
        BigDecimal precioPublico = precioSinRedondear.divide(resto, 0, RoundingMode.CEILING).multiply(resto);
        producto.setPrecio_publico(precioPublico.setScale(2, RoundingMode.HALF_UP));
    }

    private BigDecimal obtenerValorDolar() {
        try {
            return dolarFeignClient.getValorDolar(1).getBody();
        } catch (Exception e) {
            log.error("No se pudo obtener el valor del dólar del microservicio. Usando valor por defecto: {}. Causa: {}", dolarDefaultValue, e.getMessage());
            return new BigDecimal(dolarDefaultValue);
        }
    }

    private void validarRelaciones(Long tipoProductoId, Long proveedorId) {
        try {
            Objects.requireNonNull(tipoProductoId, "El ID del tipo de producto no puede ser nulo.");
            Objects.requireNonNull(proveedorId, "El ID del proveedor no puede ser nulo.");
            tipoProductoClient.getTipoProductoById(tipoProductoId);
            proveedorClient.getProveedorById(proveedorId);
        } catch (NullPointerException ex) {
            throw new BusinessLogicException(ex.getMessage());
        } catch (FeignException.NotFound ex) {
            log.warn("Error de validación de relaciones: {}", ex.getMessage());
            throw new ResourceNotFoundException("El tipo de producto o el proveedor especificado no existe.");
        }
    }

    private void updateProductoFields(Producto target, Producto source) {
        if (source.getCodigoProducto() != null) target.setCodigoProducto(source.getCodigoProducto());
        if (source.getDescripcion() != null) target.setDescripcion(source.getDescripcion());
        if (source.getTipoProductoId() != null) target.setTipoProductoId(source.getTipoProductoId());
        if (source.getProveedorId() != null) target.setProveedorId(source.getProveedorId());
        if (source.getFecha_ingreso() != null) target.setFecha_ingreso(source.getFecha_ingreso());
        if (source.getCantidad() > 0) target.setCantidad(source.getCantidad());
        if (source.getIva() != null) target.setIva(source.getIva());
        if (source.getPorcentaje_ganancia() != null) target.setPorcentaje_ganancia(source.getPorcentaje_ganancia());
        if (source.getPrecio_sin_iva() != null) target.setPrecio_sin_iva(source.getPrecio_sin_iva());
        if (source.getResto() != null) target.setResto(source.getResto());
        if (source.getProductosRelacionadosIds() != null) {
            Set<Producto> nuevasRelaciones = new HashSet<>(productoRepository.findAllById(source.getProductosRelacionadosIds()));
            target.setProductosRelacionados(nuevasRelaciones);
        }
        if(source.isCostoFijo() != target.isCostoFijo()) target.setCostoFijo(source.isCostoFijo());
        if(source.getCosto_pesos() != null) target.setCosto_pesos(source.getCosto_pesos());
    }
    @Transactional
    public void saveAllProducts(List<Producto> incomingProducts) {
        if (incomingProducts == null || incomingProducts.isEmpty()) {
            return;
        }

        Map<Long, Boolean> tipoOk = new HashMap<>();
        Map<Long, Boolean> proveedorOk = new HashMap<>();
        java.math.BigDecimal valorDolar = obtenerValorDolar();
        int batchSize = 100;
        int processed = 0;

        for (Producto incoming : incomingProducts) {
            log.info(incoming.toString());
            for (int attempt = 1; attempt <= 2; attempt++) {
                try {
                    if (incoming.getCodigoProducto() == null || incoming.getCodigoProducto().trim().isEmpty()) {
                        incoming.setCodigoProducto("PROD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                    }

                    if (incoming.getResto() == null || incoming.getResto().compareTo(java.math.BigDecimal.ZERO) <= 0) {
                        incoming.setResto(RESTO_DEFAULT);
                    }

                    Long tipoId = incoming.getTipoProductoId();
                    Long proveedorId = incoming.getProveedorId();
                    if (tipoId != null && !Boolean.TRUE.equals(tipoOk.get(tipoId))) {
                        tipoProductoClient.getTipoProductoById(tipoId);
                        tipoOk.put(tipoId, Boolean.TRUE);
                    }
                    if (proveedorId != null && !Boolean.TRUE.equals(proveedorOk.get(proveedorId))) {
                        proveedorClient.getProveedorById(proveedorId);
                        proveedorOk.put(proveedorId, Boolean.TRUE);
                    }

                    Optional<Producto> existingOpt = productoRepository.findByCodigoProductoAndProveedorId(
                            incoming.getCodigoProducto(),
                            incoming.getProveedorId()
                    );

                    Producto entity;
                    if (existingOpt.isPresent()) {
                        entity = existingOpt.get();
                        updateProductoFields(entity, incoming);
                    } else {
                        entity = incoming;
                        if (entity.getFecha_ingreso() == null) {
                            entity.setFecha_ingreso(LocalDate.now());
                        }
                    }

                    if (entity.isCostoFijo()) {
                        calculateFixedCostPrices(entity);
                    } else {
                        recalculatePrices(entity, valorDolar);
                    }

                    productoRepository.save(entity);

                    if (++processed % batchSize == 0) {
                        em.flush();
                        em.clear();
                    }

                    break;
                } catch (feign.FeignException | ResourceNotFoundException ex) {
                    if (attempt == 2) {
                        log.error("Fallo definitivo al procesar producto {}: {}", incoming.getCodigoProducto(), ex.getMessage());
                        throw ex;
                    }
                    log.warn("Fallo al procesar producto {} (intento {}/2). Reintentando...", incoming.getCodigoProducto(), attempt);
                    try {
                        Thread.sleep(200L);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                }
            }
        }

        em.flush();
        em.clear();
    }
    @Transactional
    public void deleteMultiple(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new IllegalArgumentException("La lista de IDs no puede estar vacía.");
        }
        log.info("Eliminando múltiples relaciones con IDs en service: {}", ids);
        productoRepository.eliminarRelacionesEnBloque(ids);
        log.info("Se eliminaron las relaciones: {}", ids);
        productoRepository.deleteAllById(ids);
        log.info("Se eliminaron los productos: {}", ids);
    }
    @Transactional(readOnly = true)
    public LastModifiedDTO getLastModified() {
        Long timestamp = productoRepository.findMaxLastModifiedTimestamp();
        return new LastModifiedDTO(timestamp != null ? timestamp : 0L);
    }
}