INSERT INTO financial.recurring_movements (id, external_id, version, created_on, last_update, name, value, starting_at, state, auto_launch, indeterminate, total_quotes, starting_quote, current_quote, description, id_classification, id_cost_center)
VALUES (9101, 'e12805f3-1419-4a7b-994b-4c751255fc7a', 0, current_timestamp, NULL,
        'Gym', 320.00, '2024-01-02', 'ACTIVE', true, true, NULL, NULL, NULL, 'Gym fees', 9101, 9101),
       (9102, '08d874d2-f56d-49b9-a6b3-bf86e075d986', 0, current_timestamp, NULL,
        'Pilates', 400.00, '2024-01-04', 'ENDED', false, false, 12, 1, 12, NULL, 9102, 9102);
