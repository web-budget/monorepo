-- Cadastro inicial do webBudget: 14 centros de custo (regra 50/30/20) e 41 classificações.
-- Só cadastros, todos ativos e sem descrição; os centros de custo ficam sem orçamento.
-- NÃO é idempotente: rodar de novo falha no nome das classificações e, como a carga é uma transação só, não grava nada.
\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM administration.users WHERE email = 'admin@webbudget.com.br') THEN
        RAISE EXCEPTION 'admin@webbudget.com.br não encontrado — suba o server e espere as migrações terminarem antes de carregar os dados';
    END IF;
END $$;

-- A hora do app é a de São Paulo; sem isto um carregamento no container (UTC) grava created_on adiantado.
SET LOCAL TIME ZONE 'America/Sao_Paulo';

-- Centros de custo raiz (id_parent nulo, full_name igual ao nome).
INSERT INTO registration.cost_centers (external_id, version, created_on, last_update, active, name, full_name, id_parent)
SELECT gen_random_uuid(), 0, LOCALTIMESTAMP, LOCALTIMESTAMP, TRUE, v.name, v.name, NULL
FROM (VALUES
    ('Essenciais'),
    ('Estilo de vida'),
    ('Futuro'),
    ('Renda')
) AS v (name);

-- Centros de custo filhos (full_name no formato "Pai > Filho").
INSERT INTO registration.cost_centers (external_id, version, created_on, last_update, active, name, full_name, id_parent)
SELECT gen_random_uuid(), 0, LOCALTIMESTAMP, LOCALTIMESTAMP, TRUE, v.name, parent.full_name || ' > ' || v.name, parent.id
FROM (VALUES
    ('Essenciais', 'Moradia'),
    ('Essenciais', 'Alimentação'),
    ('Essenciais', 'Transporte'),
    ('Essenciais', 'Saúde'),
    ('Essenciais', 'Educação'),
    ('Estilo de vida', 'Lazer'),
    ('Estilo de vida', 'Pessoal'),
    ('Futuro', 'Reserva'),
    ('Futuro', 'Investimento'),
    ('Futuro', 'Dívidas')
) AS v (parent_name, name)
JOIN registration.cost_centers AS parent ON parent.full_name = v.parent_name AND parent.id_parent IS NULL;

-- Classificações (lista plana). O app grava last_update nulo na criação.
INSERT INTO registration.classifications (external_id, version, created_on, active, generic, name, type)
SELECT gen_random_uuid(), 0, LOCALTIMESTAMP, TRUE, v.name IN ('Outras despesas', 'Outras receitas'), v.name, v.type
FROM (VALUES
    ('Aluguel ou prestação', 'EXPENSE'),
    ('Condomínio', 'EXPENSE'),
    ('Energia', 'EXPENSE'),
    ('Água', 'EXPENSE'),
    ('Gás', 'EXPENSE'),
    ('Internet e telefone', 'EXPENSE'),
    ('Manutenção da casa', 'EXPENSE'),
    ('Móveis e eletrodomésticos', 'EXPENSE'),
    ('Mercado', 'EXPENSE'),
    ('Refeições fora', 'EXPENSE'),
    ('Delivery', 'EXPENSE'),
    ('Combustível ou recarga', 'EXPENSE'),
    ('Transporte público e apps', 'EXPENSE'),
    ('Manutenção do veículo', 'EXPENSE'),
    ('Estacionamento e pedágio', 'EXPENSE'),
    ('Seguro do veículo', 'EXPENSE'),
    ('Plano de saúde', 'EXPENSE'),
    ('Consultas e exames', 'EXPENSE'),
    ('Farmácia', 'EXPENSE'),
    ('Academia e esportes', 'EXPENSE'),
    ('Mensalidade escolar', 'EXPENSE'),
    ('Cursos e livros', 'EXPENSE'),
    ('Passeios e eventos', 'EXPENSE'),
    ('Viagens', 'EXPENSE'),
    ('Streaming e assinaturas', 'EXPENSE'),
    ('Vestuário', 'EXPENSE'),
    ('Cuidados pessoais', 'EXPENSE'),
    ('Presentes e doações', 'EXPENSE'),
    ('Pets', 'EXPENSE'),
    ('Impostos e taxas', 'EXPENSE'),
    ('Tarifas bancárias e juros', 'EXPENSE'),
    ('Parcela de dívida', 'EXPENSE'),
    ('Outras despesas', 'EXPENSE'),
    ('Salário', 'INCOME'),
    ('13º e férias', 'INCOME'),
    ('Renda extra e serviços', 'INCOME'),
    ('Rendimentos', 'INCOME'),
    ('Reembolsos', 'INCOME'),
    ('Restituições', 'INCOME'),
    ('Venda de bens', 'INCOME'),
    ('Outras receitas', 'INCOME')
) AS v (name, type);

COMMIT;
