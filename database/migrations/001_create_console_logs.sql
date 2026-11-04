CREATE TABLE IF NOT EXISTS console_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  action VARCHAR(64) NOT NULL,
  resource VARCHAR(253) NOT NULL,
  actor_email VARCHAR(254) NULL,
  outcome ENUM('success', 'failure') NOT NULL,
  detail VARCHAR(1024) NOT NULL,
  PRIMARY KEY (id),
  INDEX logs_created (created_at DESC, id DESC),
  INDEX logs_outcome_created (outcome, created_at DESC, id DESC),
  INDEX logs_action_created (action, created_at DESC, id DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
