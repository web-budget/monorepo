INSERT INTO registration.cost_centers (external_id, version, created_on, last_update, active, name, full_name, description, expense_budget_percentage, id_parent)
VALUES ('52e3456b-1b0d-42c5-8be0-07ddaecce441', 0, current_timestamp, current_timestamp, true, 'Outros', 'Outros', 'Centro de custo geral', 10, NULL);

INSERT INTO registration.cost_centers (external_id, version, created_on, last_update, active, name, full_name, description, expense_budget_percentage, id_parent)
VALUES ('3cb5732d-2551-4eb9-8b41-f5d312ba7aac', 0, current_timestamp, current_timestamp, true, 'Carro', 'Carro', NULL, 50, NULL);

INSERT INTO registration.cost_centers (external_id, version, created_on, last_update, active, name, full_name, description, expense_budget_percentage, id_parent)
VALUES ('99a9e2df-0980-4724-b9a4-bba7d8c12120', 0, current_timestamp, current_timestamp, false, 'Impostos', 'Carro > Impostos', 'Impostos do carro', 25,
        (SELECT id FROM registration.cost_centers WHERE external_id = '3cb5732d-2551-4eb9-8b41-f5d312ba7aac'));
