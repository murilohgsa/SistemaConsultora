-- =====================================================================
-- MIGRAÇÃO: notificações para o cliente
-- =====================================================================
-- Aplicada no Supabase em 20/10/2026. Pode ser rodada de novo sem problema.
--
-- Quando a consultora salva um look novo para um cliente, a rota
-- /salvar_look grava uma linha aqui. O cliente vê essa linha no sininho
-- das telas dele (feed, perfil, adicionar peça).
-- =====================================================================

CREATE TABLE IF NOT EXISTS notificacao (
    id_notificacao SERIAL PRIMARY KEY,
    -- quem recebe a notificação (o cliente)
    id_usuario INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    -- o look que gerou a notificação; se o look for apagado, a notificação some junto
    id_look INT REFERENCES looks(id_look) ON DELETE CASCADE,
    mensagem TEXT NOT NULL,
    -- FALSE = ainda não vista (conta no número vermelho do sininho)
    lida BOOLEAN NOT NULL DEFAULT FALSE,
    data TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- deixa rápida a busca "notificações deste usuário, mais novas primeiro"
CREATE INDEX IF NOT EXISTS notificacao_usuario_data_idx ON notificacao (id_usuario, data DESC);

-- RLS ligado, igual às outras tabelas (o Flask usa a service key, que ignora o RLS)
ALTER TABLE notificacao ENABLE ROW LEVEL SECURITY;
