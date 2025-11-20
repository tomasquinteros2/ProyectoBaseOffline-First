package micro.authservice.service;

import micro.authservice.dto.InviteCodeDTO;
import micro.authservice.dto.InviteRequestDTO;
import micro.authservice.entity.InviteCode;
import micro.authservice.repository.InviteCodeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class AuthService {

    private final InviteCodeRepository repository;
    private final EmailService emailService;
    private final String managerEmail;
    private final SecureRandom random = new SecureRandom();
    private static final String ALPHANUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    public AuthService(InviteCodeRepository repository,
                       EmailService emailService,
                       @Value("${application.invite.manager-email}") String managerEmail) {
        this.repository = repository;
        this.emailService = emailService;
        this.managerEmail = managerEmail;
    }

    @Transactional
    public InviteCodeDTO generateInviteCode(InviteRequestDTO request) {
        String code = generateCode(10);
        InviteCode invite = new InviteCode();
        invite.setCode(code);
        invite.setRequestedBy(request.getRequestedUsername());
        invite.setRequestedRole(request.getRequestedRole());
        invite.setCreatedAt(Instant.now());
        invite.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
        invite.setUsed(false);

        repository.save(invite);

        emailService.sendInviteCodeEmail(invite);

        return new InviteCodeDTO(
                null,
                managerEmail,
                java.time.LocalDateTime.ofInstant(invite.getExpiresAt(), java.time.ZoneId.systemDefault()),
                "Tu solicitud de acceso ha sido enviada al administrador. Recibirás un código de invitación por email en " + managerEmail
        );
    }

    @Transactional
    public boolean validateAndUseInviteCode(String code, String username) {
        return repository.findByCode(code)
                .filter(invite -> !invite.isUsed())
                .filter(invite -> invite.getExpiresAt().isAfter(Instant.now()))
                .map(invite -> {
                    invite.setUsed(true);
                    repository.save(invite);
                    return true;
                })
                .orElse(false);
    }

    private String generateCode(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(ALPHANUM.charAt(random.nextInt(ALPHANUM.length())));
        }
        return sb.toString();
    }
}
