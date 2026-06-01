-- ── Admin Feature Migration ────────────────────────────────────────────────

-- 1. Add is_admin flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin TINYINT(1) DEFAULT 0;

-- 2. Reports table (user reports on posts or comments)
CREATE TABLE IF NOT EXISTS content_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id INT NOT NULL,
    content_type ENUM('post','comment') NOT NULL,
    content_id INT NOT NULL,
    reason ENUM('spam','harassment','inappropriate','misinformation','other') NOT NULL DEFAULT 'other',
    details TEXT,
    status ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_report (reporter_id, content_type, content_id),
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_content ON content_reports(content_type, content_id);

-- 3. Grant admin to a specific user by email (change as needed):
-- UPDATE users SET is_admin = 1 WHERE email = 'youremail@example.com';
