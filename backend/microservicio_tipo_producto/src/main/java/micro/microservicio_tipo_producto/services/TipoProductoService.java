package micro.microservicio_tipo_producto.services;

import jakarta.transaction.Transactional;
import micro.microservicio_tipo_producto.entities.TipoProducto;
import micro.microservicio_tipo_producto.exceptions.BusinessLogicException;
import micro.microservicio_tipo_producto.exceptions.ResourceNotFoundException;
import micro.microservicio_tipo_producto.repositories.TipoProductoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TipoProductoService {

    private static final Logger log = LoggerFactory.getLogger(TipoProductoService.class);


    private final TipoProductoRepository tipoProductoRepository;

    private final ObjectMapper objectMapper;

    public TipoProductoService(TipoProductoRepository tipoProductoRepository) {
        this.tipoProductoRepository = tipoProductoRepository;
        this.objectMapper = new ObjectMapper();
    }
    @Cacheable(value = "tiposProducto", unless = "#result == null || #result.isEmpty()")
    public List<TipoProducto> findAll() {
        log.info("Buscando todos los tipos de producto.");
        return tipoProductoRepository.findAll();
    }

    @Cacheable(value = "tipoProducto", key = "#id")
    public TipoProducto findById(Long id) {
        log.info("Buscando tipo de producto con ID: {}", id);
        return tipoProductoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tipo de producto no encontrado con ID: " + id));
    }

    @Transactional
    @CacheEvict(value = "tiposProducto", allEntries = true)
    public List<TipoProducto> saveAll(List<TipoProducto> tiposParaGuardar) {
        log.info("Iniciando guardado masivo de {} tipos de producto.", tiposParaGuardar.size());

        List<String> nombresAValidar = tiposParaGuardar.stream()
                .map(TipoProducto::getNombre)
                .filter(nombre -> nombre != null && !nombre.trim().isEmpty())
                .map(String::trim)
                .distinct()
                .collect(Collectors.toList());

        if (nombresAValidar.isEmpty()) {
            log.warn("La lista para guardado masivo está vacía o no contiene nombres válidos.");
            return new ArrayList<>();
        }

        Set<String> nombresExistentes = tipoProductoRepository.findByNombreIn(nombresAValidar).stream()
                .map(TipoProducto::getNombre)
                .collect(Collectors.toSet());

        List<TipoProducto> tiposRealmenteNuevos = tiposParaGuardar.stream()
                .filter(tipo -> {
                    String nombre = tipo.getNombre() != null ? tipo.getNombre().trim() : "";
                    return !nombre.isEmpty() && !nombresExistentes.contains(nombre);
                })
                .collect(Collectors.toList());

        if (tiposRealmenteNuevos.isEmpty()) {
            log.info("No se encontraron nuevos tipos de producto para guardar. Todos los proporcionados ya existen o son inválidos.");
            return new ArrayList<>();
        }

        log.info("Guardando {} nuevos tipos de producto.", tiposRealmenteNuevos.size());
        return tipoProductoRepository.saveAll(tiposRealmenteNuevos);
    }

    @Caching(
            put = { @CachePut(value = "tipoProducto", key = "#result.id") },
            evict = { @CacheEvict(value = "tiposProducto", allEntries = true) }
    )
    @Transactional
    public TipoProducto save(TipoProducto tipoProducto) {
        log.info("Guardando nuevo tipo de producto: {}", tipoProducto);
        if (tipoProducto.getNombre() == null || tipoProducto.getNombre().trim().isEmpty()) {
            throw new BusinessLogicException("El nombre del tipo de producto es obligatorio.");
        }
        Optional<TipoProducto> existingTipo = tipoProductoRepository.findByNombre(tipoProducto.getNombre());
        if (existingTipo.isPresent()) {
            throw new BusinessLogicException("Ya existe un tipo de producto con el nombre: " + tipoProducto.getNombre());
        }
        TipoProducto tipoGuardado = tipoProductoRepository.save(tipoProducto);

        return tipoGuardado;
    }

    @Caching(
            put = { @CachePut(value = "tipoProducto", key = "#id") },
            evict = { @CacheEvict(value = "tiposProducto", allEntries = true) }
    )
    @Transactional
    public TipoProducto update(Long id, TipoProducto tipoProductoDetails) {
        log.info("Actualizando tipo de producto con ID: {}", id);
        TipoProducto tipoExistente = findById(id);

        if (tipoProductoDetails.getNombre() == null || tipoProductoDetails.getNombre().trim().isEmpty()) {
            throw new BusinessLogicException("El nombre del tipo de producto es obligatorio para la actualización.");
        }

        Optional<TipoProducto> existingWithName = tipoProductoRepository.findByNombre(tipoProductoDetails.getNombre());
        if (existingWithName.isPresent() && !existingWithName.get().getId().equals(id)) {
            throw new BusinessLogicException("Ya existe otro tipo de producto con el nombre: " + tipoProductoDetails.getNombre());
        }

        tipoExistente.setNombre(tipoProductoDetails.getNombre());

        TipoProducto tipoActualizado = tipoProductoRepository.save(tipoExistente);

        return tipoActualizado;
    }

    @Caching(evict = {
            @CacheEvict(value = "tiposProducto", allEntries = true),
            @CacheEvict(value = "tipoProducto", key = "#id")
    })
    @Transactional
    public void delete(Long id) {
        log.info("Eliminando tipo de producto con ID: {}", id);
        if (!tipoProductoRepository.existsById(id)) {
            throw new ResourceNotFoundException("Tipo de producto no encontrado con ID: " + id);
        }
        tipoProductoRepository.deleteById(id);
        log.info("Tipo de producto con ID {} eliminado correctamente.", id);
    }
    public void validarExistencia(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        Set<Long> uniqueIds = new HashSet<>(ids);
        List<TipoProducto> foundTipos = tipoProductoRepository.findAllById(uniqueIds);

        if (foundTipos.size() < uniqueIds.size()) {
            Set<Long> foundIds = foundTipos.stream()
                    .map(TipoProducto::getId)
                    .collect(Collectors.toSet());
            uniqueIds.removeAll(foundIds);

            throw new ResourceNotFoundException("No se encontraron los siguientes IDs de tipo de producto: " + uniqueIds);
        }
        log.info("Todos los {} IDs de tipos de producto fueron validados exitosamente.", uniqueIds.size());
    }
}