DELETE FROM administration.instance_settings;
DELETE FROM administration.password_recover_attempts;
DELETE FROM administration.account_activation_attempt;
DELETE FROM administration.trusted_devices;
DELETE FROM administration.grants
WHERE id_user IN (SELECT id FROM administration.users WHERE email <> 'admin@webbudget.com.br')
   OR id_role IN (SELECT id FROM administration.roles WHERE name NOT IN ('ADMINISTRATION', 'REGISTRATION', 'FINANCIAL', 'DASHBOARDS'));
DELETE FROM administration.users WHERE email <> 'admin@webbudget.com.br';
DELETE FROM administration.roles WHERE name NOT IN ('ADMINISTRATION', 'REGISTRATION', 'FINANCIAL', 'DASHBOARDS');
UPDATE administration.mail_settings
SET enabled             = false,
    host                = NULL,
    port                = NULL,
    security            = 'STARTTLS',
    username            = NULL,
    password_ciphertext = NULL,
    from_address        = NULL,
    from_name           = NULL,
    reply_to_address    = NULL,
    last_update         = now()
WHERE id = 1;
