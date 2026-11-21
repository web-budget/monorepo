INSERT INTO financial.transfers (id, external_id, version, created_on, last_update, value, description, id_from_wallet, id_to_wallet, id_returned_transfer)
VALUES (9101, '0b6e0c4a-6f3e-4c55-8a39-0d3c1c1f9a01', 0, '2024-12-10 09:15:00', NULL, 100.00, 'Savings', 9101, 9103, NULL);

INSERT INTO financial.wallet_entries (id, external_id, version, created_on, last_update, name, direction, origin, value, previous_balance, resulting_balance, id_wallet, id_movement, id_financial_period, id_transfer)
VALUES (9101, '5d2a6c1e-8b0f-4f5d-9c0e-7a1b2c3d4e01', 0, '2024-12-01 10:00:00', NULL,
        'Deposit', 'CREDIT', 'INCOME', 1000.00, 0.00, 1000.00, 9101, NULL, 9101, NULL),
       (9102, '5d2a6c1e-8b0f-4f5d-9c0e-7a1b2c3d4e02', 0, '2024-12-05 11:30:00', NULL,
        'Rent', 'DEBIT', 'EXPENSE', 400.00, 1000.00, 600.00, 9101, 9101, 9101, NULL),
       (9103, '5d2a6c1e-8b0f-4f5d-9c0e-7a1b2c3d4e03', 0, '2024-12-10 09:15:00', NULL,
        'Financial test other wallet', 'DEBIT', 'TRANSFER', 100.00, 600.00, 500.00, 9101, NULL, NULL, 9101),
       (9104, '5d2a6c1e-8b0f-4f5d-9c0e-7a1b2c3d4e04', 0, '2024-12-10 09:15:00', NULL,
        'Financial test wallet', 'CREDIT', 'TRANSFER', 100.00, 0.00, 100.00, 9103, NULL, NULL, 9101),
       (9105, '5d2a6c1e-8b0f-4f5d-9c0e-7a1b2c3d4e05', 0, '2024-12-20 16:45:00', NULL,
        'Rounding', 'CREDIT', 'ADJUSTMENT', 0.50, 500.00, 500.50, 9101, NULL, NULL, NULL);

UPDATE registration.wallets SET current_balance = 500.50 WHERE id = 9101;
UPDATE registration.wallets SET current_balance = 100.00 WHERE id = 9103;
