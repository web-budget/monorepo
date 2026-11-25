INSERT INTO financial.recurring_movements (id, external_id, version, created_on, last_update, name, type, value_kind, installments, first_installment, auto_launch, active, id_cost_center, id_classification, id_card)
VALUES (9201, 'c3e2a5d4-7f6b-4c8d-9e0f-2a3b4c5d6e01', 0, '2024-12-01 10:00:00', NULL,
        'Conta de luz', 'EXPENSE', 'VARIABLE', NULL, 1, false, true, 9101, 9101, NULL),
       (9202, 'c3e2a5d4-7f6b-4c8d-9e0f-2a3b4c5d6e02', 0, '2024-12-02 10:00:00', NULL,
        'Conta de água', 'EXPENSE', 'VARIABLE', NULL, 1, false, true, 9101, 9101, NULL),
       (9203, 'c3e2a5d4-7f6b-4c8d-9e0f-2a3b4c5d6e03', 0, '2024-12-03 10:00:00', NULL,
        'Academia', 'EXPENSE', 'FIXED', NULL, 1, true, true, 9101, 9101, NULL),
       (9204, 'c3e2a5d4-7f6b-4c8d-9e0f-2a3b4c5d6e04', 0, '2024-12-04 10:00:00', NULL,
        'aluguel', 'EXPENSE', 'FIXED', NULL, 1, true, true, 9101, 9101, NULL),
       (9205, 'c3e2a5d4-7f6b-4c8d-9e0f-2a3b4c5d6e05', 0, '2024-12-05 10:00:00', NULL,
        'Aluguel', 'EXPENSE', 'FIXED', NULL, 1, true, true, 9101, 9101, NULL),
       (9206, 'c3e2a5d4-7f6b-4c8d-9e0f-2a3b4c5d6e06', 0, '2024-12-06 10:00:00', NULL,
        'Água mineral', 'EXPENSE', 'FIXED', NULL, 1, true, true, 9101, 9101, NULL);

INSERT INTO financial.recurring_values (id, external_id, version, created_on, last_update, id_recurring_movement, value, reason, valid_from)
VALUES (9201, 'd4f3b6e5-8a7c-4d9e-8f1a-3b4c5d6e7f01', 0, '2024-12-01 10:00:00', NULL, 9201, 150.00, NULL, '2024-12-01 10:00:00'),
       (9202, 'd4f3b6e5-8a7c-4d9e-8f1a-3b4c5d6e7f02', 0, '2024-12-02 10:00:00', NULL, 9202, 90.00, NULL, '2024-12-02 10:00:00'),
       (9203, 'd4f3b6e5-8a7c-4d9e-8f1a-3b4c5d6e7f03', 0, '2024-12-03 10:00:00', NULL, 9203, 99.90, NULL, '2024-12-03 10:00:00'),
       (9204, 'd4f3b6e5-8a7c-4d9e-8f1a-3b4c5d6e7f04', 0, '2024-12-04 10:00:00', NULL, 9204, 1800.00, NULL, '2024-12-04 10:00:00'),
       (9205, 'd4f3b6e5-8a7c-4d9e-8f1a-3b4c5d6e7f05', 0, '2024-12-05 10:00:00', NULL, 9205, 1800.00, NULL, '2024-12-05 10:00:00'),
       (9206, 'd4f3b6e5-8a7c-4d9e-8f1a-3b4c5d6e7f06', 0, '2024-12-06 10:00:00', NULL, 9206, 12.00, NULL, '2024-12-06 10:00:00');
