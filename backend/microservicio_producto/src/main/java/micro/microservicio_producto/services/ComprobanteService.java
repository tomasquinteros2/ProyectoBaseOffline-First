package micro.microservicio_producto.services;

import jakarta.transaction.Transactional;
import micro.microservicio_producto.entities.NroComprobante;
import micro.microservicio_producto.exceptions.ResourceNotFoundException;
import micro.microservicio_producto.repositories.ComprobanteRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ComprobanteService {

    private final ComprobanteRepository comprobanteRepository;

    @Value("${app.storage.local}")
    private String rutaAlmacenamientoLocal;

    public ComprobanteService(ComprobanteRepository comprobanteRepository) {
        this.comprobanteRepository = comprobanteRepository;
    }

    @Transactional
    public List<NroComprobante> findAll() {
        return comprobanteRepository.findAll();
    }

    @Transactional
    public NroComprobante obtenerComprobante(String numeroCompleto) {
        if (numeroCompleto == null || numeroCompleto.length() < 3) {
            throw new IllegalArgumentException("Formato de número de comprobante inválido: " + numeroCompleto);
        }

        String prefijo = numeroCompleto.substring(0, 2);
        String numeroStr = numeroCompleto.substring(2);

        if (!numeroStr.matches("\\d+")) {
            throw new IllegalArgumentException("La parte numérica del comprobante debe ser solo dígitos: " + numeroStr);
        }

        int numero = Integer.parseInt(numeroStr);

        return comprobanteRepository.findByPrefijoAndNumero(prefijo, numero)
                .orElseThrow(() -> new ResourceNotFoundException("Comprobante no encontrado con número: " + numeroCompleto));
    }

    @Transactional
    public NroComprobante incrementar() {
        NroComprobante comprobante = comprobanteRepository.findById(1L)
                .orElseThrow(() -> new ResourceNotFoundException("No se encontró el registro de control de comprobantes (ID 1)"));

        int numeroActual = comprobante.getNumero();
        String prefijoActual = comprobante.getPrefijo();

        if (numeroActual >= 999999) {
            comprobante.setNumero(0);
            comprobante.setPrefijo(incrementarPrefijo(prefijoActual));
        } else {
            comprobante.setNumero(numeroActual + 1);
        }
        return comprobante;
    }

    public String generarNumeroComprobanteUnico(){
        NroComprobante comprobante = incrementar();
        return comprobante.getPrefijo() + String.format("%06d", comprobante.getNumero());
    }

    @Transactional
    public NroComprobante generarComprobanteCompleto(String htmlComprobante) throws IOException {
        NroComprobante nroComprobante = incrementar();

        String numeroCompleto = nroComprobante.getPrefijo() + String.format("%06d", nroComprobante.getNumero());

        NroComprobante nuevoComprobante = new NroComprobante();
        nuevoComprobante.setNumero(nroComprobante.getNumero());
        nuevoComprobante.setPrefijo(nroComprobante.getPrefijo());
        nuevoComprobante.setContenidoHtml(htmlComprobante);
        nuevoComprobante.setFechaGeneracion(LocalDateTime.now());

        comprobanteRepository.save(nuevoComprobante);
        guardarCopiaLocal(htmlComprobante, numeroCompleto);

        comprobanteRepository.save(nroComprobante);

        return nuevoComprobante;
    }

    private void guardarCopiaLocal(String contenido, String numeroComprobante) throws IOException {
        Path directorio = Paths.get(rutaAlmacenamientoLocal);
        if (!Files.exists(directorio)) {
            Files.createDirectories(directorio);
        }
        Path archivo = directorio.resolve("comp_" + numeroComprobante + ".html");
        Files.write(archivo, contenido.getBytes(StandardCharsets.UTF_8));
    }

    private String incrementarPrefijo(String prefijo) {
        if (prefijo == null || prefijo.length() != 2) {
            throw new IllegalArgumentException("El prefijo para incrementar debe ser de 2 caracteres.");
        }
        char[] letras = prefijo.toCharArray();
        if (letras[1] < 'Z') {
            letras[1]++;
        } else {
            letras[1] = 'A';
            if (letras[0] < 'Z') {
                letras[0]++;
            } else {
                throw new IllegalStateException("Se ha alcanzado el límite máximo de prefijos (ZZ).");
            }
        }
        return new String(letras);
    }
}