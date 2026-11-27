INSERT INTO registration.compartments (id, external_id, version, created_on, last_update, name, type, balance, description, target_value, target_date, id_wallet)
VALUES (9101, 'c0a1e9a0-0000-4000-8000-000000009101', 0, '2024-11-01 10:00:00', NULL, 'Emergency', 'RESERVE', 1000.00, NULL, NULL, NULL, 9101),
       (9102, 'c0a1e9a0-0000-4000-8000-000000009102', 0, '2024-11-02 10:00:00', NULL, 'Stocks', 'INVESTMENT', 500.00, NULL, NULL, NULL, 9101),
       (9103, 'c0a1e9a0-0000-4000-8000-000000009103', 0, '2024-11-03 10:00:00', NULL, 'Trip', 'GOAL', 1050.00, 'Trip to the beach', 1800.00, '2099-12-31', 9101),
       (9104, 'c0a1e9a0-0000-4000-8000-000000009104', 0, '2024-11-04 10:00:00', NULL, 'Old trip', 'GOAL', 100.00, NULL, 500.00, '2020-01-01', 9101),
       (9105, 'c0a1e9a0-0000-4000-8000-000000009105', 0, '2024-11-05 10:00:00', NULL, 'Done goal', 'GOAL', 300.00, NULL, 200.00, NULL, 9101),
       (9106, 'c0a1e9a0-0000-4000-8000-000000009106', 0, '2024-11-06 10:00:00', NULL, 'Frozen reserve', 'RESERVE', 200.00, NULL, NULL, NULL, 9102),
       (9107, 'c0a1e9a0-0000-4000-8000-000000009107', 0, '2024-11-07 10:00:00', NULL, 'Empty', 'INVESTMENT', 0.00, NULL, NULL, NULL, 9101),
       (9108, 'c0a1e9a0-0000-4000-8000-000000009108', 0, '2024-11-08 10:00:00', NULL, 'Dateless goal', 'GOAL', 0.00, NULL, NULL, NULL, 9101);

INSERT INTO financial.compartment_movements (id, external_id, version, created_on, last_update, direction, value, note, previous_balance, resulting_balance, id_compartment)
VALUES (9101, 'c0a1e9a0-1111-4000-8000-000000009101', 0, '2024-12-01 10:00:00', NULL, 'DEPOSIT', 100.00, NULL, 0.00, 100.00, 9107),
       (9102, 'c0a1e9a0-1111-4000-8000-000000009102', 0, '2024-12-02 10:00:00', NULL, 'WITHDRAWAL', 100.00, 'Back to free', 100.00, 0.00, 9107),
       (9103, 'c0a1e9a0-1111-4000-8000-000000009103', 0, '2024-12-01 08:00:00', NULL, 'DEPOSIT', 700.00, NULL, 0.00, 700.00, 9101),
       (9104, 'c0a1e9a0-1111-4000-8000-000000009104', 0, '2024-12-02 08:00:00', NULL, 'DEPOSIT', 500.00, NULL, 700.00, 1200.00, 9101),
       (9105, 'c0a1e9a0-1111-4000-8000-000000009105', 0, '2024-12-03 08:00:00', NULL, 'WITHDRAWAL', 200.00, 'Car', 1200.00, 1000.00, 9101);

INSERT INTO financial.wallet_entries (id, external_id, version, created_on, last_update, name, direction, origin, value, previous_balance, resulting_balance, id_wallet, id_movement, id_financial_period, id_transfer, id_compartment_movement)
VALUES (9101, 'c0a1e9a0-2222-4000-8000-000000009101', 0, '2024-12-01 10:00:00', NULL, 'Empty', 'DEBIT', 'COMPARTMENT', 100.00, 50.00, -50.00, 9101, NULL, NULL, NULL, 9101),
       (9102, 'c0a1e9a0-2222-4000-8000-000000009102', 0, '2024-12-02 10:00:00', NULL, 'Empty', 'CREDIT', 'COMPARTMENT', 100.00, -50.00, 50.00, 9101, NULL, NULL, NULL, 9102),
       (9103, 'c0a1e9a0-2222-4000-8000-000000009103', 0, '2024-12-03 08:00:00', NULL, 'Emergency', 'CREDIT', 'COMPARTMENT', 200.00, -150.00, 50.00, 9101, NULL, NULL, NULL, 9105);

UPDATE registration.wallets SET current_balance = 50.00 WHERE id = 9101;
