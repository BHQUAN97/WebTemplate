# WebTemplate Backups

Daily backups. Encrypted with AES-256 if BACKUP_ENCRYPT_KEY is set.

Decrypt: gpg --decrypt --output FILE FILE.gpg

Structure: webtemplate/YYYY-MM-DD/{webtemplate.sql.gz, uploads.zip}
