package micro.microservicio_proveedor.services;

import micro.microservicio_proveedor.entities.dto.LastModifiedDTO;
import micro.microservicio_proveedor.events.CotizacionCambiadaEvent;
import org.springframework.context.ApplicationEventPublisher;
import jakarta.transaction.Transactional;
import micro.microservicio_proveedor.entities.Proveedor;
import micro.microservicio_proveedor.entities.dto.ProveedorMapper;
import micro.microservicio_proveedor.entities.dto.ProveedorResponseDTO;
import micro.microservicio_proveedor.exceptions.BusinessLogicException;
import micro.microservicio_proveedor.exceptions.ResourceNotFoundException;
import micro.microservicio_proveedor.feignClient.ProductoFeignClient;
import micro.microservicio_proveedor.repositories.ProveedorRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.util.ReflectionUtils;

import java.lang.reflect.Field;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ProveedorService {

    private static final Logger log = LoggerFactory.getLogger(ProveedorService.class);

    private final ApplicationEventPublisher eventPublisher;
    private final ProductoFeignClient productoFeignClient;
    private final ProveedorRepository proveedorRepository;

    public ProveedorService(ProveedorRepository proveedorRepository,ProductoFeignClient productoFeignClient,ApplicationEventPublisher eventPublisher) {
        this.proveedorRepository = proveedorRepository;
        this.productoFeignClient = productoFeignClient;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public java.util.List<Proveedor> findAll() {
        log.info("Buscando todos los proveedores y sus detalles desde la BD.");
        return proveedorRepository.findAll();
    }
    @Transactional
    @Cacheable(value = "proveedorDto", key = "#id")
    public ProveedorResponseDTO findDtoById(Long id) {
        log.info("Buscando proveedor (full fetch) ID: {}", id);
        Proveedor proveedor = proveedorRepository.findFullById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado con ID: " + id));
        return ProveedorMapper.toDTO(proveedor);
    }
    @Cacheable(value = "proveedor", key = "#id")
    public Proveedor findById(Long id) {
        log.info("Buscando proveedor con ID: {} desde la BD.", id);
        return proveedorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado con ID: " + id));
    }

    @Caching(evict = {
            @CacheEvict(value = "proveedor", key = "#result.id"),
            @CacheEvict(value = "proveedorDto", key = "#result.id")
    })
    @Transactional
    public Proveedor save(Proveedor proveedor) {
        log.info("Guardando nuevo proveedor: {}", proveedor);
        if (proveedor.getNombre() != null && !proveedor.getNombre().trim().isEmpty()) {
            proveedorRepository.findByNombre(proveedor.getNombre()).ifPresent(p -> {
                throw new BusinessLogicException("Ya existe un proveedor con el nombre: " + proveedor.getNombre());
            });
        }
        proveedor.getRazonesSociales().forEach(rs -> {
            rs.setProveedor(proveedor);
            rs.getCuentasBancarias().forEach(cb -> cb.setRazonSocial(rs));
        });

        Proveedor proveedorGuardado = proveedorRepository.save(proveedor);
        log.info("Proveedor nuevo guardado: {}", proveedorGuardado);
        return proveedorGuardado;
    }

    @Caching(
            put = {
                    @CachePut(value = "proveedor", key = "#id")
            },
            evict = {
                    @CacheEvict(value = "proveedorDto", key = "#id")
            }
    )
    @Transactional
    public Proveedor update(Long id, Proveedor proveedorDetails) {
        log.info("Actualizando proveedor con ID: {}", id);
        Proveedor existente = findById(id);

        if (proveedorDetails.getNombre() != null && !proveedorDetails.getNombre().trim().isEmpty()) {
            Optional<Proveedor> existingWithName = proveedorRepository.findByNombre(proveedorDetails.getNombre());
            if (existingWithName.isPresent() && !existingWithName.get().getId().equals(id)) {
                throw new BusinessLogicException("Ya existe otro proveedor con el nombre: " + proveedorDetails.getNombre());
            }
        }

        boolean cotizacionCambio = hasCotizacionChanged(existente, proveedorDetails);

        updateSimpleFields(existente, proveedorDetails);
        existente.getRazonesSociales().clear();
        if (proveedorDetails.getRazonesSociales() != null) {
            proveedorDetails.getRazonesSociales().forEach(rs -> {
                rs.setProveedor(existente);
                rs.getCuentasBancarias().forEach(cb -> cb.setRazonSocial(rs));
                existente.getRazonesSociales().add(rs);
            });
        }

        Proveedor proveedorActualizado = proveedorRepository.save(existente);

        //em.flush();
        //em.clear();

        if (cotizacionCambio) {
            log.info("Cotización cambió para proveedor ID: {}. Programando recalculo DESPUÉS del commit.", id);
            // Publicar evento que se ejecutará DESPUÉS del commit
            eventPublisher.publishEvent(new CotizacionCambiadaEvent(id, proveedorDetails.getValorCotizacionManual()));
        }

        log.info("Proveedor con ID {} actualizado correctamente.", id);
        return proveedorActualizado;
    }

    private void updateSimpleFields(Proveedor existente, Proveedor details) {
        for (Field field : Proveedor.class.getDeclaredFields()) {
            field.setAccessible(true);
            try {
                Object value = field.get(details);
                if (value != null && !(value instanceof java.util.Collection)) {
                    ReflectionUtils.setField(field, existente, value);
                }
            } catch (IllegalAccessException e) {
                log.error("Error al acceder al campo {} para actualizar", field.getName(), e);
            }
        }
    }

    @Caching(evict = {
            @CacheEvict(value = "proveedor", key = "#id"),
            @CacheEvict(value = "proveedorDto", key = "#id")
    })
    @Transactional
    public void delete(Long id) {
        log.info("Eliminando proveedor con ID: {}", id);
        if (!proveedorRepository.existsById(id)) {
            throw new ResourceNotFoundException("Proveedor no encontrado con ID: " + id);
        }
        proveedorRepository.deleteById(id);
        log.info("Proveedor con ID {} eliminado correctamente.", id);
    }

    public void validarExistencia(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        Set<Long> uniqueIds = new HashSet<>(ids);
        List<Proveedor> foundProveedores = proveedorRepository.findAllById(uniqueIds);

        if (foundProveedores.size() < uniqueIds.size()) {
            Set<Long> foundIds = foundProveedores.stream()
                    .map(Proveedor::getId)
                    .collect(Collectors.toSet());
            uniqueIds.removeAll(foundIds);

            throw new ResourceNotFoundException("No se encontraron los siguientes IDs de proveedor: " + uniqueIds);
        }
        log.info("Todos los {} IDs de proveedores fueron validados exitosamente.", uniqueIds.size());
    }
    private boolean hasCotizacionChanged(Proveedor existente, Proveedor nuevo) {
        if (nuevo.getValorCotizacionManual() == null) {
            return false;
        }
        return existente.getValorCotizacionManual() == null ||
                existente.getValorCotizacionManual().compareTo(nuevo.getValorCotizacionManual()) != 0;
    }

    @Transactional
    public LastModifiedDTO getLastModified() {
        Long timestamp = proveedorRepository.findMaxLastModifiedTimestamp();
        return new LastModifiedDTO(timestamp != null ? timestamp : 0L);
    }
}
