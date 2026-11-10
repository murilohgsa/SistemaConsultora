-- =====================================================================
-- [NOVO] Tabela ANUNCIO — "Roupas para comprar" no feed da cliente
-- ---------------------------------------------------------------------
-- A consultora cadastra sugestões de compra (peça de uma loja, com foto,
-- preço e link). Elas aparecem para a cliente:
--   * no feed, intercaladas com os looks, marcadas como "Patrocinado"
--   * na aba COMPRAR, numa grade de fotos filtrável por parte do corpo
--
-- id_cliente NULL  -> o anúncio aparece para TODAS as clientes
-- id_cliente = X   -> o anúncio aparece só para aquela cliente
-- ativo = false    -> fica guardado, mas não aparece para ninguém
--
-- Já foi aplicado no Supabase (projeto SistemaConsultoria). Este arquivo
-- fica no repositório como registro, igual aos outros migracao_*.sql.
-- =====================================================================

create table if not exists public.anuncio (
    id_anuncio  serial primary key,
    titulo      varchar(120) not null,
    loja        varchar(80),
    preco       numeric(10, 2),
    link        text,                     -- página da peça na loja
    imagem      text not null,            -- URL (Cloudinary ou link da loja)
    descricao   text,
    parte_corpo smallint references public.parte_corpo (id_parte),
    id_cliente  integer references public.usuario (id_usuario) on delete cascade,
    ativo       boolean not null default true,
    data        timestamptz default current_timestamp
);

-- consultas mais comuns: anúncios ativos de uma cliente (ou de todas)
create index if not exists anuncio_ativo_cliente_idx on public.anuncio (ativo, id_cliente);

-- Mesmo padrão das outras tabelas: RLS ligado e nenhuma política.
-- O Flask acessa com a chave de serviço (service_role), que ignora o RLS;
-- já a chave pública (anon) não consegue ler nem alterar nada.
alter table public.anuncio enable row level security;
