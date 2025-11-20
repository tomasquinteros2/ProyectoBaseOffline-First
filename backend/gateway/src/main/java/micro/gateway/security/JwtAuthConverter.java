package micro.gateway.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.stream.Collectors;

@Component
public class JwtAuthConverter implements Converter<Jwt, Mono<AbstractAuthenticationToken>> {

    // Apuntamos al claim correcto ("auth")
    private static final String AUTH_CLAIM = "auth";

    @Override
    public Mono<AbstractAuthenticationToken> convert(Jwt jwt) {
        Collection<GrantedAuthority> authorities = extractAuthorities(jwt);
        return Mono.just(new JwtAuthenticationToken(jwt, authorities, getPrincipalClaimName(jwt)));
    }

    private String getPrincipalClaimName(Jwt jwt) {
        return jwt.getClaimAsString("sub");
    }

    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        String claim = jwt.getClaimAsString(AUTH_CLAIM);

        if (claim == null || claim.isBlank()) {
            return Collections.emptyList();
        }

        //convierte el String del token directamente en una autoridad.
        return Arrays.stream(claim.split(","))
                .map(String::trim)
                .map(SimpleGrantedAuthority::new) // Usa el valor tal cual (ej: "ADMIN")
                .collect(Collectors.toList());
    }
}