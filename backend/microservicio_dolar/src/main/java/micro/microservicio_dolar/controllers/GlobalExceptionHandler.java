package micro.microservicio_dolar.controllers; // O un paquete 'exceptions'

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

import java.util.Map;
import java.util.NoSuchElementException; // O la excepción que lance tu servicio

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> handleNotFoundException(NoSuchElementException ex, WebRequest request) {
        Map<String, String> body = Map.of(
                "status", String.valueOf(HttpStatus.NOT_FOUND.value()),
                "error", "Not Found",
                "message", ex.getMessage() // Mensaje de la excepción (ej: "Dolar con id X no encontrado")
        );
        return new ResponseEntity<>(body, HttpStatus.NOT_FOUND);
    }

    // Un manejador genérico para cualquier otra excepción inesperada.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGlobalException(Exception ex, WebRequest request) {
        Map<String, String> body = Map.of(
                "status", String.valueOf(HttpStatus.INTERNAL_SERVER_ERROR.value()),
                "error", "Internal Server Error",
                "message", "Ocurrió un error inesperado en el servidor."
        );
        return new ResponseEntity<>(body, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}