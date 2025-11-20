CREATE TABLE IF NOT EXISTS invite_code (
                                           id BIGSERIAL PRIMARY KEY,
                                           code VARCHAR(20) NOT NULL UNIQUE,
    requested_by VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMP,
    used_by VARCHAR(50)
    );

CREATE INDEX IF NOT EXISTS idx_code ON invite_code(code);
CREATE INDEX IF NOT EXISTS idx_used ON invite_code(used);
