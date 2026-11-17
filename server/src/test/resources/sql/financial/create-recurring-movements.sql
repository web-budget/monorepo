INSERT INTO financial.recurring_movements (id, external_id, version, created_on, last_update, name, value, starting_at, state, auto_launch, indeterminate, total_quotes, starting_quote, current_quote, description, id_classification, id_cost_center)
VALUES (9101, 'ba870b58-01aa-4477-8ea1-1c644a6770c4', 0, current_timestamp, NULL,
        'Gym', 320.00, '2024-01-02', 'ACTIVE', true, true, NULL, NULL, NULL, 'Gym fees', 9101, 9101),
       (9102, '2afc2759-b38e-4e1a-9a56-3f54c11c7e5c', 0, current_timestamp, NULL,
        'Pilates', 400.00, '2024-01-04', 'ENDED', false, false, 12, 1, 12, NULL, 9102, 9102);
