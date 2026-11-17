INSERT INTO registration.cost_centers (id, external_id, version, created_on, last_update, active, name, full_name, description, income_budget, expense_budget)
VALUES (9101, '338c8eea-6d53-4e68-882d-cec57c0ac49f', 0, current_timestamp, current_timestamp, true,
        'Financial test health', 'Financial test health', 'Health and well being', 1000.00, 800.00),
       (9102, 'bfe5413f-1cc6-46cb-967c-8a3b11046747', 0, current_timestamp, current_timestamp, true,
        'Financial test home', 'Financial test home', 'Home expenses', NULL, NULL);

INSERT INTO registration.classifications (id, external_id, version, created_on, last_update, active, name, type, description, budget)
VALUES (9101, '503cee43-583e-4df5-a9db-8bf049cf6a8d', 0, current_timestamp, current_timestamp, true,
        'Financial test gym', 'EXPENSE', 'Gym fees', 320.00),
       (9102, 'fd17c780-50b0-4669-9c1c-272c6f5d3413', 0, current_timestamp, current_timestamp, true,
        'Financial test salary', 'INCOME', 'Monthly salary', NULL);

INSERT INTO registration.financial_periods (id, external_id, version, created_on, last_update, name, starting_at, ending_at, status, expenses_goal, revenues_goal)
VALUES (9101, '2a7b99bc-f077-4dbf-8458-87c5d0e8fd7a', 0, current_timestamp, current_timestamp,
        'Financial test 12/2024', '2024-12-01', '2024-12-31', 'ACTIVE', 4500.00, 9000.00),
       (9102, '6531c609-577b-4a45-82a9-debe0b53eeab', 0, current_timestamp, current_timestamp,
        'Financial test 07/2024', '2024-07-01', '2024-07-31', 'ACCOUNTED', 5000.00, 10000.00),
       (9103, '6248abb7-a8ad-4d2b-a0a4-0417b98cb008', 0, current_timestamp, current_timestamp,
        'Financial test 08/2024', '2024-08-01', '2024-08-31', 'ENDED', 4500.00, 9000.00);
