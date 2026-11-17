DELETE FROM financial.wallet_balances;
DELETE FROM financial.period_movements;
DELETE FROM financial.recurring_movements;
DELETE FROM financial.transferences;
DELETE FROM financial.payments;
DELETE FROM financial.credit_card_invoices;
DELETE FROM registration.financial_periods WHERE id IN (9101, 9102, 9103);
DELETE FROM registration.classifications WHERE id IN (9101, 9102);
DELETE FROM registration.cost_centers WHERE id IN (9101, 9102);
