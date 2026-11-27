INSERT INTO financial.wallet_entries (id, external_id, version, created_on, last_update, name, direction, origin, value, previous_balance, resulting_balance, id_wallet, id_movement, id_financial_period, id_transfer)
VALUES (9111, '5d2a6c1e-8b0f-4f5d-9c0e-7a1b2c3d4e11', 0, '2024-12-12 10:00:00', NULL,
        'Interest of the bank', 'CREDIT', 'ADJUSTMENT', 10.00, 100.00, 110.00, 9103, NULL, NULL, NULL),
       (9112, '5d2a6c1e-8b0f-4f5d-9c0e-7a1b2c3d4e12', 0, '2024-12-15 10:00:00', NULL,
        'Bank fee', 'DEBIT', 'ADJUSTMENT', 15.00, 110.00, 95.00, 9103, NULL, NULL, NULL),
       (9113, '5d2a6c1e-8b0f-4f5d-9c0e-7a1b2c3d4e13', 0, '2024-12-18 09:30:00', NULL,
        'Rounding of the bank', 'CREDIT', 'ADJUSTMENT', 0.50, 95.00, 95.50, 9103, NULL, NULL, NULL);

INSERT INTO financial.wallet_reconciliations (id, external_id, version, created_on, last_update, informed_balance, wallet_balance, difference, reason, id_wallet, id_wallet_entry)
VALUES (9111, '8c4d2f10-3a5b-4e6c-9d7e-1f2a3b4c5d11', 0, '2024-12-12 10:00:00', NULL, 110.00, 100.00, 10.00, 'Interest of the bank', 9103, 9111),
       (9112, '8c4d2f10-3a5b-4e6c-9d7e-1f2a3b4c5d12', 0, '2024-12-15 10:00:00', NULL, 95.00, 110.00, -15.00, 'Bank fee', 9103, 9112),
       (9113, '8c4d2f10-3a5b-4e6c-9d7e-1f2a3b4c5d13', 0, '2024-12-18 09:30:00', NULL, 95.50, 95.00, 0.50, 'Rounding of the bank', 9103, 9113);

UPDATE registration.wallets SET current_balance = 95.50 WHERE id = 9103;
