INSERT INTO financial.card_purchases (id, external_id, version, created_on, last_update, name, purchased_on, value, id_invoice, id_classification, id_cost_center, id_movement)
VALUES (9101, '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c01', 0, current_timestamp, NULL, 'Pizza', '2024-12-05', 80.00, 9101, 9101, 9102, NULL),
       (9102, '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c02', 0, current_timestamp, NULL, 'Cinema', '2024-12-20', 45.50, 9101, 9101, 9101, NULL),
       (9103, '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c03', 0, current_timestamp, NULL, 'Books', '2024-08-15', 120.00, 9102, 9101, 9101, NULL);
