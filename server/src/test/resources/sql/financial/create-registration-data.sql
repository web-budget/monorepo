INSERT INTO registration.cost_centers (id, external_id, version, created_on, last_update, active, name, full_name, description, income_budget, expense_budget)
VALUES (9101, '2bed30e7-419d-4097-841c-7d88fbc708ad', 0, current_timestamp, current_timestamp, true,
        'Financial test health', 'Financial test health', 'Health and well being', 1000.00, 800.00),
       (9102, '52e3456b-1b0d-42c5-8be0-07ddaecce441', 0, current_timestamp, current_timestamp, true,
        'Financial test home', 'Financial test home', 'Home expenses', NULL, NULL);

INSERT INTO registration.classifications (id, external_id, version, created_on, last_update, active, name, type, description, budget)
VALUES (9101, 'ff8ac873-2cbd-43dd-a3e8-2bc451f4e3fa', 0, current_timestamp, current_timestamp, true,
        'Financial test gym', 'EXPENSE', 'Gym fees', 320.00),
       (9102, 'f21d94d2-d28e-4aa3-b12d-8a520023edd9', 0, current_timestamp, current_timestamp, true,
        'Financial test salary', 'INCOME', 'Monthly salary', NULL);

INSERT INTO registration.financial_periods (id, external_id, version, created_on, last_update, name, starting_at, ending_at, status, expenses_goal, revenues_goal)
VALUES (9101, 'bc67ba91-7c0a-466d-877c-0b1fe2fb56bd', 0, current_timestamp, current_timestamp,
        'Financial test 12/2024', '2024-12-01', '2024-12-31', 'ACTIVE', 4500.00, 9000.00),
       (9102, 'df05156c-3fce-4f56-88ff-918d50200312', 0, current_timestamp, current_timestamp,
        'Financial test 07/2024', '2024-07-01', '2024-07-31', 'ACCOUNTED', 5000.00, 10000.00),
       (9103, '27881a12-5e61-43cd-a6d0-fdb32eaa75c0', 0, current_timestamp, current_timestamp,
        'Financial test 08/2024', '2024-08-01', '2024-08-31', 'ENDED', 4500.00, 9000.00);
