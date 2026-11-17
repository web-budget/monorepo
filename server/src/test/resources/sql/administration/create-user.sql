INSERT INTO administration.users (external_id, version, created_on, name, email, password, active, default_language)
VALUES ('6706a395-6690-4bad-948a-5c3c823e93d2', 0, current_timestamp, 'User', 'user@webbudget.com.br',
        'fixture-password-hash', true, 'PT_BR');

INSERT INTO administration.users (external_id, version, created_on, name, email, password, active, default_language)
VALUES ('a75ed639-6935-4c6b-8037-95575ab0ba46', 0, current_timestamp, 'Other User', 'other-user@webbudget.com.br',
        'fixture-password-hash', false, 'EN_US');

INSERT INTO administration.roles (external_id, version, created_on, name)
VALUES ('686f3fa3-6a08-4a5a-8587-d27b94a64097', 0, current_timestamp, 'OTHER');

INSERT INTO administration.grants (external_id, version, created_on, id_user, id_role)
SELECT '05e9d984-8bff-4842-9feb-fd2c513a08e8', 0, current_timestamp, users.id, roles.id
FROM administration.users AS users, administration.roles AS roles
WHERE users.email = 'user@webbudget.com.br' AND roles.name = 'DASHBOARDS';

INSERT INTO administration.grants (external_id, version, created_on, id_user, id_role)
SELECT 'e5f54104-28a0-4e2e-a2bc-ddc6a38ba05e', 0, current_timestamp, users.id, roles.id
FROM administration.users AS users, administration.roles AS roles
WHERE users.email = 'other-user@webbudget.com.br' AND roles.name = 'OTHER';
