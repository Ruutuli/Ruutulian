-- Remove admin_credentials table (admin login uses USERNAME/PASSWORD from env only)
DROP TRIGGER IF EXISTS update_admin_credentials_updated_at ON admin_credentials;
DROP FUNCTION IF EXISTS update_admin_credentials_updated_at();
DROP TABLE IF EXISTS admin_credentials;
