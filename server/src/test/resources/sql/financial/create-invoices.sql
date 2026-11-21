INSERT INTO registration.cards (id, external_id, version, created_on, last_update, active, name, last_four_digits, invoice_payment_day, flag, id_wallet)
VALUES (9101, '3c9a7e52-1f4b-4d0a-8e6c-2b7d9f1a0b01', 0, current_timestamp, NULL, true, 'Financial test card', '9101', 10, NULL, NULL),
       (9102, '3c9a7e52-1f4b-4d0a-8e6c-2b7d9f1a0b02', 0, current_timestamp, NULL, true, 'Financial test other card', '9102', 20, NULL, NULL);

INSERT INTO financial.invoices (id, external_id, version, created_on, last_update, status, id_card, id_financial_period)
VALUES (9101, '8f1d2b3c-4a5e-4c6d-9e7f-0a1b2c3d4e01', 0, current_timestamp, NULL, 'OPEN', 9101, 9101),
       (9102, '8f1d2b3c-4a5e-4c6d-9e7f-0a1b2c3d4e02', 0, current_timestamp, NULL, 'CLOSED', 9101, 9103),
       (9103, '8f1d2b3c-4a5e-4c6d-9e7f-0a1b2c3d4e03', 0, current_timestamp, NULL, 'OPEN', 9102, 9101),
       (9104, '8f1d2b3c-4a5e-4c6d-9e7f-0a1b2c3d4e04', 0, current_timestamp, NULL, 'OPEN', 9101, 9102);
