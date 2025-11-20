package micro.authservice.service;

import jakarta.mail.internet.MimeMessage;
import micro.authservice.entity.InviteCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final String managerEmail;
    private final String fromEmail;

    public EmailService(JavaMailSender mailSender,
                        @Value("${application.invite.manager-email}") String managerEmail,
                        @Value("${application.invite.from-email}") String fromEmail) {
        this.mailSender = mailSender;
        this.managerEmail = managerEmail;
        this.fromEmail = fromEmail;
    }

    @Async
    public void sendInviteCodeEmail(InviteCode invite) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(managerEmail);
            helper.setSubject("Nueva solicitud de acceso - EcopilaStock");

            String body = String.format(
                    "═══════════════════════════════════════\n" +
                            "   SOLICITUD DE ACCESO AL SISTEMA\n" +
                            "═══════════════════════════════════════\n\n" +
                            "Usuario solicitante: %s\n" +
                            "Rol solicitado: %s\n\n" +
                            "CÓDIGO DE INVITACIÓN:\n" +
                            "┌─────────────────────────────┐\n" +
                            "│   %s   │\n" +
                            "└─────────────────────────────┘\n\n" +
                            "Válido hasta: %s\n\n" +
                            "Por favor, proporciona este código al usuario\n" +
                            "para que complete su registro en la aplicación.\n\n" +
                            "═══════════════════════════════════════",
                    invite.getRequestedBy(),
                    invite.getRequestedRole(),
                    invite.getCode(),
                    invite.getExpiresAt().toString()
            );

            helper.setText(body, false);

            mailSender.send(message);
            System.out.println("=== EMAIL ENVIADO EXITOSAMENTE ===");

        } catch (Exception ex) {
            System.err.println("=== ERROR AL ENVIAR EMAIL ===");
            ex.printStackTrace();
        }
    }
}
