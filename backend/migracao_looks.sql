-- =====================================================================
-- MIGRAÇÃO: partes do corpo, categorias de peça e categorias de look
-- =====================================================================
-- Este arquivo foi aplicado no Supabase em 20/10/2026.
-- Ele é "idempotente": usa IF NOT EXISTS / ON CONFLICT, então pode ser
-- rodado de novo sem quebrar nada (útil se alguém montar o banco do zero).
--
-- Resumo do que ele faz:
--   1. Cria a tabela parte_corpo (1 cabeça, 2 tronco, 3 cintura, 4 pés, 5 acessório)
--   2. Liga cada CATEGORIA de peça a uma parte do corpo
--      (ex.: "Calça" -> 3 cintura, "Sapato" -> 4 pés)
--      Assim, ao clicar na bolinha da cabeça na silhueta, o sistema sabe
--      quais peças mostrar: todas cuja categoria é da parte 1 (cabeça).
--   3. Cria a tabela categoria_look (Inverno, Verão, Festa, Casamento...)
--   4. Cria a tabela look_categoria, que liga um look a VÁRIAS categorias
--      (um mesmo look pode ser "Inverno" e "Festa" ao mesmo tempo)
--   5. Ajusta a chave estrangeira looks -> usuario para apagar os looks
--      junto quando o cliente for excluído (antes dava erro ao excluir)
-- =====================================================================


-- 1. PARTES DO CORPO ---------------------------------------------------
-- Tabela fixa (não muda pelo sistema). O número é o que fica salvo nas
-- outras tabelas e é o mesmo usado no data-parte das bolinhas do HTML.
CREATE TABLE IF NOT EXISTS parte_corpo (
    id_parte SMALLINT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO parte_corpo (id_parte, nome) VALUES
    (1, 'Cabeça'),
    (2, 'Tronco'),
    (3, 'Cintura'),
    (4, 'Pés'),
    (5, 'Acessório')
ON CONFLICT (id_parte) DO NOTHING;


-- 2. CATEGORIA DE PEÇA -> PARTE DO CORPO -------------------------------
-- Nova coluna na tabela categoria. Pode ficar vazia (NULL) para categorias
-- antigas; elas só não aparecem ao clicar nas bolinhas da silhueta.
ALTER TABLE categoria
    ADD COLUMN IF NOT EXISTS parte_corpo SMALLINT
    REFERENCES parte_corpo(id_parte) ON DELETE SET NULL;

-- Classifica as categorias que já existiam no banco
UPDATE categoria SET parte_corpo = 2 WHERE nome IN ('Vestido', 'Camisa', 'Blazer', 'Moletom') AND parte_corpo IS NULL;
UPDATE categoria SET parte_corpo = 3 WHERE nome IN ('Calça', 'Saia') AND parte_corpo IS NULL;

-- O contador de id (sequence) da tabela categoria estava atrasado: as categorias
-- antigas foram inseridas com id fixo, então o próximo id gerado (4) já existia.
-- Isso coloca o contador no maior id atual, para os próximos INSERTs não colidirem.
SELECT setval(pg_get_serial_sequence('categoria', 'id_categoria'), (SELECT MAX(id_categoria) FROM categoria));

-- Algumas categorias novas para cobrir todas as partes do corpo
INSERT INTO categoria (nome, parte_corpo) VALUES
    ('Chapéu', 1),
    ('Boné', 1),
    ('Blusa', 2),
    ('Short', 3),
    ('Sapato', 4),
    ('Tênis', 4),
    ('Sandália', 4),
    ('Bolsa', 5),
    ('Colar', 5),
    ('Óculos', 5),
    ('Cinto', 5)
ON CONFLICT (nome) DO NOTHING;


-- 3. CATEGORIAS DE LOOK ------------------------------------------------
-- Diferente da categoria da PEÇA: aqui é a categoria do LOOK inteiro
-- (estação ou ocasião). A consultora pode cadastrar novas pela tela.
CREATE TABLE IF NOT EXISTS categoria_look (
    id_categoria_look SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO categoria_look (nome) VALUES
    ('Inverno'), ('Verão'), ('Outono'), ('Primavera'),
    ('Sair'), ('Festa'), ('Casamento'), ('Trabalho'), ('Casual')
ON CONFLICT (nome) DO NOTHING;


-- 4. LOOK <-> CATEGORIAS DE LOOK (muitos para muitos) ------------------
-- Cada linha diz "o look X pertence à categoria Y".
-- ON DELETE CASCADE: se o look for apagado, as ligações somem junto.
CREATE TABLE IF NOT EXISTS look_categoria (
    id_look INT NOT NULL REFERENCES looks(id_look) ON DELETE CASCADE,
    id_categoria_look INT NOT NULL REFERENCES categoria_look(id_categoria_look) ON DELETE CASCADE,
    PRIMARY KEY (id_look, id_categoria_look)
);


-- 5. EXCLUIR CLIENTE APAGA OS LOOKS DELE -------------------------------
-- Antes a FK era "NO ACTION": excluir um cliente com looks dava erro.
ALTER TABLE looks DROP CONSTRAINT IF EXISTS looks_id_cliente_fkey;
ALTER TABLE looks
    ADD CONSTRAINT looks_id_cliente_fkey
    FOREIGN KEY (id_cliente) REFERENCES usuario(id_usuario) ON DELETE CASCADE;


-- RLS (Row Level Security) ligado, igual às outras tabelas do projeto.
-- O Flask usa a SUPABASE_SERVICE_KEY, que ignora o RLS, então funciona normal.
ALTER TABLE parte_corpo ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria_look ENABLE ROW LEVEL SECURITY;
ALTER TABLE look_categoria ENABLE ROW LEVEL SECURITY;
