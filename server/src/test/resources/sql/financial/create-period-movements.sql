INSERT INTO financial.period_movements (id, external_id, version, created_on, last_update, name, due_date, value, state, quote_number, description, id_financial_period, id_classification, id_cost_center)
VALUES (9101, '4a26f975-c9a9-4231-958c-9b59ee55e04f', 0, current_timestamp, NULL,
        'Gym', '2024-12-30', 320.00, 'OPEN', NULL, 'Gym fees of december', 9101, 9101, 9101),
       (9102, '655a0c7f-caf4-4213-be64-e28c5646e979', 0, current_timestamp, NULL,
        'Salary', '2024-07-05', 8500.50, 'ACCOUNTED', NULL, 'Salary of july', 9102, 9102, 9102),
       (9103, 'c237997e-c784-429d-9d22-a9f5cc079822', 0, current_timestamp, NULL,
        'Groceries', '2024-12-10', 89.90, 'PAID', 2, NULL, 9101, 9101, 9102);
