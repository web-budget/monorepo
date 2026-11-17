INSERT INTO financial.period_movements (id, external_id, version, created_on, last_update, name, due_date, value, state, quote_number, description, id_financial_period, id_classification, id_cost_center)
VALUES (9101, '287e26fa-763b-4efb-908e-734e637bb6fd', 0, current_timestamp, NULL,
        'Gym', '2024-12-30', 320.00, 'OPEN', NULL, 'Gym fees of december', 9101, 9101, 9101),
       (9102, '413b96ec-fed9-487f-b587-7bb9c4989020', 0, current_timestamp, NULL,
        'Salary', '2024-07-05', 8500.50, 'ACCOUNTED', NULL, 'Salary of july', 9102, 9102, 9102),
       (9103, '5d1d1e86-5f4e-4bd5-93df-3b0f5fd6b8d4', 0, current_timestamp, NULL,
        'Groceries', '2024-12-10', 89.90, 'PAID', 2, NULL, 9101, 9101, 9102);
