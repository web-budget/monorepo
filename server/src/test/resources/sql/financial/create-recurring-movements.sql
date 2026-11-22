INSERT INTO financial.recurring_movements (id, external_id, version, created_on, last_update, name, type, value_kind, installments, first_installment, auto_launch, active, id_cost_center, id_classification, id_card)
VALUES (9101, 'a1c0e3b2-5d4f-4a6b-8c7d-0e1f2a3b4c01', 0, '2024-11-01 10:00:00', NULL,
        'Streaming', 'EXPENSE', 'FIXED', NULL, 1, true, true, 9101, 9101, NULL),
       (9102, 'a1c0e3b2-5d4f-4a6b-8c7d-0e1f2a3b4c02', 0, '2024-11-02 10:00:00', NULL,
        'Electricity', 'EXPENSE', 'VARIABLE', NULL, 1, false, true, 9102, 9101, NULL),
       (9103, 'a1c0e3b2-5d4f-4a6b-8c7d-0e1f2a3b4c03', 0, '2024-11-03 10:00:00', NULL,
        'Phone', 'EXPENSE', 'FIXED', 12, 1, false, true, 9101, 9101, NULL),
       (9104, 'a1c0e3b2-5d4f-4a6b-8c7d-0e1f2a3b4c04', 0, '2024-11-04 10:00:00', NULL,
        'Salary', 'INCOME', 'FIXED', NULL, 1, true, false, 9101, 9102, NULL);

INSERT INTO financial.recurring_values (id, external_id, version, created_on, last_update, id_recurring_movement, value, reason, valid_from)
VALUES (9101, 'b2d1f4c3-6e5a-4b7c-9d8e-1f2a3b4c5d01', 0, '2024-11-01 10:00:00', NULL, 9101, 39.90, NULL, '2024-11-01 10:00:00'),
       (9102, 'b2d1f4c3-6e5a-4b7c-9d8e-1f2a3b4c5d02', 0, '2024-11-02 10:00:00', NULL, 9102, 150.00, NULL, '2024-11-02 10:00:00'),
       (9103, 'b2d1f4c3-6e5a-4b7c-9d8e-1f2a3b4c5d03', 0, '2024-11-03 10:00:00', NULL, 9103, 249.90, NULL, '2024-11-03 10:00:00'),
       (9104, 'b2d1f4c3-6e5a-4b7c-9d8e-1f2a3b4c5d04', 0, '2024-11-04 10:00:00', NULL, 9104, 8000.00, NULL, '2024-11-04 10:00:00');
