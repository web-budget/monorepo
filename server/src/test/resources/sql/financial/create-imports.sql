INSERT INTO financial.recurring_movements (id, external_id, version, created_on, last_update, name, type, value_kind, installments, first_installment, auto_launch, active, id_cost_center, id_classification, id_card)
VALUES (9201, 'c1d0e3b2-5d4f-4a6b-8c7d-0e1f2a3b4c01', 0, '2024-11-01 10:00:00', NULL, 'Celular Novo Exemplo', 'EXPENSE', 'FIXED', 12, 1, false, true, 9101, 9101, 9101),
       (9202, 'c1d0e3b2-5d4f-4a6b-8c7d-0e1f2a3b4c02', 0, '2024-11-02 10:00:00', NULL, 'Salary Exemplo', 'INCOME', 'FIXED', NULL, 1, false, true, 9101, 9102, NULL),
       (9203, 'c1d0e3b2-5d4f-4a6b-8c7d-0e1f2a3b4c03', 0, '2024-11-03 10:00:00', NULL, 'Streaming Exemplo', 'EXPENSE', 'FIXED', 3, 1, false, true, 9101, 9101, 9101),
       (9204, 'c1d0e3b2-5d4f-4a6b-8c7d-0e1f2a3b4c04', 0, '2024-11-04 10:00:00', NULL, 'Gym fee', 'EXPENSE', 'FIXED', NULL, 1, false, true, 9101, 9101, NULL),
       (9205, 'c1d0e3b2-5d4f-4a6b-8c7d-0e1f2a3b4c05', 0, '2024-11-05 10:00:00', NULL, 'Magazine', 'EXPENSE', 'FIXED', NULL, 1, false, true, 9101, 9101, 9101);

INSERT INTO financial.recurring_values (id, external_id, version, created_on, last_update, id_recurring_movement, value, reason, valid_from)
VALUES (9201, 'd2d1f4c3-6e5a-4b7c-9d8e-1f2a3b4c5d01', 0, '2024-11-01 10:00:00', NULL, 9201, 1200.00, NULL, '2024-11-01 10:00:00'),
       (9202, 'd2d1f4c3-6e5a-4b7c-9d8e-1f2a3b4c5d02', 0, '2024-11-02 10:00:00', NULL, 9202, 3000.00, NULL, '2024-11-02 10:00:00'),
       (9203, 'd2d1f4c3-6e5a-4b7c-9d8e-1f2a3b4c5d03', 0, '2024-11-03 10:00:00', NULL, 9203, 39.90, NULL, '2024-11-03 10:00:00'),
       (9204, 'd2d1f4c3-6e5a-4b7c-9d8e-1f2a3b4c5d04', 0, '2024-11-04 10:00:00', NULL, 9204, 80.00, NULL, '2024-11-04 10:00:00'),
       (9205, 'd2d1f4c3-6e5a-4b7c-9d8e-1f2a3b4c5d05', 0, '2024-11-05 10:00:00', NULL, 9205, 30.00, NULL, '2024-11-05 10:00:00');

INSERT INTO financial.movements (id, external_id, version, created_on, last_update, name, type, value, due_date, status, description, id_financial_period, id_classification, id_cost_center, id_invoice)
VALUES (9201, 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a01', 0, current_timestamp, NULL, 'Celular Novo Exemplo 10/12', 'EXPENSE', 1200.00, '2024-12-31', 'OPEN', NULL, 9101, 9101, 9101, NULL),
       (9202, 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a02', 0, current_timestamp, NULL, 'Salary Exemplo', 'INCOME', 3000.00, '2024-08-31', 'OPEN', NULL, 9103, 9102, 9101, NULL),
       (9203, 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a03', 0, current_timestamp, NULL, 'Pagamento de fatura, Financial test card', 'EXPENSE', 1500.00, '2024-09-10', 'OPEN', NULL, 9103, NULL, NULL, 9102),
       (9204, 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a04', 0, current_timestamp, NULL, 'Gym fee', 'EXPENSE', 80.00, '2024-12-31', 'OPEN', NULL, 9101, 9101, 9101, NULL),
       (9205, 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a05', 0, current_timestamp, NULL, 'Magazine', 'EXPENSE', 30.00, '2024-12-31', 'OPEN', NULL, 9101, 9101, 9101, NULL);

INSERT INTO financial.recurring_launches (id, external_id, version, created_on, last_update, id_recurring_movement, id_financial_period, installment, id_movement)
VALUES (9201, 'f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 0, current_timestamp, NULL, 9201, 9101, 10, 9201),
       (9202, 'f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 0, current_timestamp, NULL, 9202, 9103, 1, 9202),
       (9204, 'f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b04', 0, current_timestamp, NULL, 9204, 9101, 1, 9204),
       (9205, 'f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b05', 0, current_timestamp, NULL, 9205, 9101, 1, 9205);

INSERT INTO financial.transfers (id, external_id, version, created_on, last_update, value, description, id_from_wallet, id_to_wallet, id_returned_transfer)
VALUES (9201, '0c6e0c4a-6f3e-4c55-8a39-0d3c1c1f9b01', 0, '2026-11-06 10:00:00', NULL, 200.00, 'Registered outgoing', 9101, 9103, NULL),
       (9202, '0c6e0c4a-6f3e-4c55-8a39-0d3c1c1f9b02', 0, '2026-11-04 10:00:00', NULL, 10.10, 'Registered incoming', 9103, 9101, NULL);

INSERT INTO financial.imports (id, external_id, version, created_on, last_update, id_financial_period, target, id_card, id_wallet, file_type, file_name, status, error, saved_on, undone_on)
VALUES (9201, '1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f01', 0, '2026-11-01 09:00:00', NULL, 9103, 'WALLET', NULL, 9101, 'BANK_ACCOUNT', 'previous-statement.ofx', 'SAVED', NULL, '2026-11-01 09:30:00', NULL),
       (9202, '1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f02', 0, '2026-11-02 09:00:00', NULL, 9103, 'CARD', 9101, NULL, NULL, 'broken.txt', 'FAILED', 'invalid-ofx-file', NULL, NULL),
       (9203, '1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f03', 0, '2026-11-03 09:00:00', NULL, 9101, 'WALLET', NULL, 9103, 'BANK_ACCOUNT', 'undone-statement.ofx', 'UNDONE', NULL, '2026-11-03 09:30:00', '2026-11-03 10:00:00'),
       (9204, '1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f04', 0, '2026-11-04 09:00:00', NULL, 9101, 'CARD', 9102, NULL, NULL, 'processing.ofx', 'PROCESSING', NULL, NULL, NULL);

INSERT INTO financial.import_lines (id, external_id, version, created_on, last_update, id_import, position, posted_on, value, fit_id, description, name, kind, action)
VALUES (9201, '2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a01', 0, current_timestamp, NULL, 9201, 1, '2026-11-12', -19.99, 'acc-0007', 'Compra no débito - Mercado Exemplo', 'Compra no débito - Mercado Exemplo', 'REGULAR', 'CREATE');

INSERT INTO financial.import_name_memories (id, external_id, version, created_on, last_update, target, normalized_name, action, id_cost_center, id_classification, id_wallet, id_recurring_movement)
VALUES (9201, '3f4a5b6c-7d8e-4f9a-8b0c-2d3e4f5a6b01', 0, current_timestamp, NULL, 'WALLET', 'maria ficticia da silva', 'TRANSFER', NULL, NULL, 9103, NULL),
       (9202, '3f4a5b6c-7d8e-4f9a-8b0c-2d3e4f5a6b02', 0, current_timestamp, NULL, 'WALLET', 'empresa ficticia ltda', 'LINK', NULL, NULL, NULL, 9202),
       (9203, '3f4a5b6c-7d8e-4f9a-8b0c-2d3e4f5a6b03', 0, current_timestamp, NULL, 'WALLET', 'energia ficticia s a', 'CREATE', 9102, 9101, NULL, NULL),
       (9204, '3f4a5b6c-7d8e-4f9a-8b0c-2d3e4f5a6b04', 0, current_timestamp, NULL, 'CARD', 'padaria sao joao cafe', 'CREATE', 9102, 9101, NULL, NULL);
