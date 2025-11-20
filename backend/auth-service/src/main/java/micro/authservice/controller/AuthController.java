package micro.authservice.controller;

import jakarta.validation.Valid;
import micro.authservice.dto.*;
import micro.authservice.entity.Usuario;
import micro.authservice.repository.InviteCodeRepository;
import micro.authservice.security.jwt.TokenProvider;
import micro.authservice.service.AuthService;
import micro.authservice.service.UserService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final TokenProvider tokenProvider;
    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final AuthService authService;
    private final InviteCodeRepository inviteCodeRepository;

    public AuthController(TokenProvider tokenProvider,
                          AuthenticationManager authenticationManager,
                          UserService userService,
                          AuthService authService,
                          InviteCodeRepository inviteCodeRepository) {
        this.tokenProvider = tokenProvider;
        this.authenticationManager = authenticationManager;
        this.userService = userService;
        this.authService = authService;
        this.inviteCodeRepository = inviteCodeRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<JwtTokenDTO> authorize(@Valid @RequestBody LoginDTO loginDTO) {
        UsernamePasswordAuthenticationToken authenticationToken =
                new UsernamePasswordAuthenticationToken(loginDTO.getUsername(), loginDTO.getPassword());

        Authentication authentication = authenticationManager.authenticate(authenticationToken);
        SecurityContextHolder.getContext().setAuthentication(authentication);

        String jwt = tokenProvider.createToken(authentication, false);

        HttpHeaders httpHeaders = new HttpHeaders();
        httpHeaders.add(HttpHeaders.AUTHORIZATION, "Bearer " + jwt);

        return new ResponseEntity<>(new JwtTokenDTO(jwt), httpHeaders, HttpStatus.OK);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody UserDTO userDTO,
            @RequestParam String inviteCode
    ) {
        try {
            Usuario user = userService.createUser(userDTO, inviteCode);
            return ResponseEntity.ok(Map.of(
                    "message", "Usuario registrado exitosamente",
                    "username", user.getUsername()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/invite/request")
    public ResponseEntity<InviteCodeDTO> requestInviteCode(@Valid @RequestBody InviteRequestDTO request) {
        InviteCodeDTO inviteCode = authService.generateInviteCode(request);
        return ResponseEntity.ok(inviteCode);
    }

    @PostMapping("/invite/validate")
    public ResponseEntity<Map<String, Object>> validateInviteCode(@RequestParam String code) {
        return inviteCodeRepository.findByCodeAndUsedFalse(code)
                .filter(inviteCode -> inviteCode.getExpiresAt().isAfter(Instant.now()))
                .map(inviteCode -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("valid", true);
                    response.put("requestedUsername", inviteCode.getRequestedBy());
                    response.put("requestedRole", inviteCode.getRequestedRole());
                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("valid", false);
                    return ResponseEntity.ok(response);
                });
    }
}
