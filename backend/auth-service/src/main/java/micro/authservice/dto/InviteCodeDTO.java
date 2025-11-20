package micro.authservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class InviteCodeDTO {

    @JsonProperty("inviteCode")
    private String inviteCode;
    private String email;
    private LocalDateTime expiresAt;
    private String message;
}
