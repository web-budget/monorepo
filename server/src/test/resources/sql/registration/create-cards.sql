INSERT INTO registration.cards (external_id, version, created_on, last_update, active, name, last_four_digits, invoice_payment_day, type, flag, id_wallet)
VALUES ('07a25a3d-ac5c-46b0-9174-24f69b2dc36c', 0, current_timestamp, NULL, true, 'Itau Personalite', '5431', NULL, 'DEBIT', NULL,
        (SELECT id FROM registration.wallets WHERE external_id = 'cd00845c-ae27-47e4-8282-c8df1c42acfe'));

INSERT INTO registration.cards (external_id, version, created_on, last_update, active, name, last_four_digits, invoice_payment_day, type, flag, id_wallet)
VALUES ('1dc82330-34c9-4f4a-b2ca-14fcd10c299f', 0, current_timestamp, NULL, false, 'XP Infinite', '1234', 8, 'CREDIT', 'Visa Infinite', NULL);
