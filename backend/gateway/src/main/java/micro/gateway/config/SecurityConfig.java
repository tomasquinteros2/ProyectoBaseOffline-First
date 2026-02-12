package micro.gateway.config;

import micro.gateway.security.AuthorityConstant;
import micro.gateway.security.JwtAuthConverter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableReactiveMethodSecurity;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebFluxSecurity
@EnableReactiveMethodSecurity
public class SecurityConfig {

    @Value("${application.security.authentication.jwt.base64-secret}")
    private String jwtBase64Secret;

    public SecurityConfig() {
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Permite peticiones desde el origen de la PWA
        configuration.setAllowedOrigins(List.of("http://localhost:5173","http://localhost:4173","https://pwa-two-iota.vercel.app", "http://212.47.70.237","http://212.47.70.237:4173"));
        // Permite los métodos HTTP que necesita
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        // Permite todas las cabeceras
        configuration.setAllowedHeaders(List.of("*"));
        // Permite que el navegador envíe credenciales (como cookies o tokens de autorización)
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http, ReactiveJwtDecoder jwtDecoder) {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .authorizeExchange(exchanges -> exchanges
                        // --- Rutas Públicas ---
                        .pathMatchers("/", "/*.html", "/*.js", "/*.css", "/webjars/**",
                                "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**", "/swagger-resources/**",
                                "/actuator/health", "/actuator/info").permitAll()
                        .pathMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .pathMatchers(HttpMethod.POST, "/api/auth/register/**").permitAll()
                        .pathMatchers(HttpMethod.POST, "/api/auth/invite/**").permitAll()
                        .pathMatchers("/api/dolar/**").authenticated()
                        .pathMatchers("/api/engine/status",
                                "/sync/client/api/engine/status").permitAll()

                        // --- Reglas para USER y ADMIN ---
                        // Permisos de LECTURA (GET)
                        .pathMatchers(HttpMethod.GET, "/api/producto/productos/**").hasAnyAuthority(AuthorityConstant.USER, AuthorityConstant.ADMIN,AuthorityConstant.VIEWER)
                        .pathMatchers(HttpMethod.GET, "/api/producto/ventas/**").hasAnyAuthority(AuthorityConstant.USER, AuthorityConstant.ADMIN,AuthorityConstant.VIEWER)
                        .pathMatchers(HttpMethod.GET, "/api/tipo-producto/tiposproducto/**").hasAnyAuthority(AuthorityConstant.USER, AuthorityConstant.ADMIN,AuthorityConstant.VIEWER)
                        .pathMatchers(HttpMethod.GET, "/api/proveedor/proveedores/**").hasAnyAuthority(AuthorityConstant.USER, AuthorityConstant.ADMIN,AuthorityConstant.VIEWER)
                        .pathMatchers(HttpMethod.POST, "/api/producto/ventas/**").hasAnyAuthority(AuthorityConstant.USER, AuthorityConstant.ADMIN,AuthorityConstant.VIEWER)
                        .pathMatchers(HttpMethod.PUT, "/api/producto/productos/descontar").hasAnyAuthority(AuthorityConstant.USER, AuthorityConstant.ADMIN,AuthorityConstant.VIEWER)

                        // --- Reglas solo para ADMIN ---
                        // Permisos de ESCRITURA (POST, PUT, DELETE) para datos maestros
                        .pathMatchers("/api/producto/productos/**").hasAuthority(AuthorityConstant.ADMIN)
                        .pathMatchers("/api/tipo-producto/tiposproducto/**").hasAuthority(AuthorityConstant.ADMIN)
                        .pathMatchers("/api/proveedor/proveedores/**").hasAuthority(AuthorityConstant.ADMIN)

                        // --- Regla Final ---
                        .anyExchange().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> {
                    jwt.jwtDecoder(jwtDecoder);
                    jwt.jwtAuthenticationConverter(jwtAuthenticationConverter());
                }));
        return http.build();
    }

    @Bean
    public ReactiveJwtDecoder reactiveJwtDecoder() {
        byte[] keyBytes = java.util.Base64.getDecoder().decode(jwtBase64Secret);
        SecretKey key = new SecretKeySpec(keyBytes, 0, keyBytes.length, "HmacSHA512");

        return NimbusReactiveJwtDecoder.withSecretKey(key)
                .macAlgorithm(MacAlgorithm.HS512)
                .build();
    }

    @Bean
    public Converter<Jwt, Mono<AbstractAuthenticationToken>> jwtAuthenticationConverter() {
        return new JwtAuthConverter();
    }
}
