package micro.authservice.service;

import micro.authservice.dto.InviteCodeDTO;
import micro.authservice.dto.InviteRequestDTO;
import micro.authservice.entity.InviteCode;
import micro.authservice.repository.InviteCodeRepository;
import micro.authservice.sync.OneDriveListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

@Service
public class AuthService {

    private final InviteCodeRepository repository;
    private final EmailService emailService;
    private final String managerEmail;
    //private final OneDriveListener oneDriveListener;
    private final SecureRandom random = new SecureRandom();
    private static final String ALPHANUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    public AuthService(InviteCodeRepository repository,
                       EmailService emailService,
                       @Value("${application.invite.manager-email}") String managerEmail
                       //OneDriveListener oneDriveListener
    ) {
        this.repository = repository;
        this.emailService = emailService;
        this.managerEmail = managerEmail;
        //this.oneDriveListener = oneDriveListener;
    }

    @Transactional
    public InviteCodeDTO generateInviteCode(InviteRequestDTO request) {
        InviteCode invite = buildInvite(request);
        repository.save(invite);

        /*TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                oneDriveListener.exportChange(invite, "SAVE");
                 // no bloquea gracias a @Async
            }
        });*/
        emailService.sendInviteCodeEmail(invite);
        return new InviteCodeDTO(
                null,
                managerEmail,
                LocalDateTime.ofInstant(invite.getExpiresAt(), ZoneId.systemDefault()),
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
                    /*TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            oneDriveListener.exportChange(invite, "SAVE");
                        }
                    });*/
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
    private InviteCode buildInvite(InviteRequestDTO request) {
        String code = generateCode(10);
        InviteCode invite = new InviteCode();
        invite.setCode(code);
        invite.setRequestedBy(request.getRequestedUsername());
        invite.setRequestedRole(request.getRequestedRole());
        invite.setCreatedAt(Instant.now());
        invite.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
        invite.setUsed(false);
        return invite;
    }
}
