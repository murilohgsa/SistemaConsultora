# Mudanças — novo visual, filtros e manequim

Resumo do que foi feito no sistema. Os detalhes estão comentados dentro de cada
arquivo: procure por `[REVISÃO]` (correção de algo que estava errado),
`[NOVO]` (funcionalidade nova) e `[NOVO VISUAL]` (só aparência).

## 1. Revisão do código (correções)

| Onde | Problema | Correção |
|---|---|---|
| `app.py` | Rotas da consultora só checavam se havia login. Um **cliente** logado conseguia abrir `/pecas/<id>` e `/looks/<id>` de outra pessoa, excluir clientes, peças e looks. | Decoradores `@login_obrigatorio` e `@somente_consultora`. |
| `app.py` `/adicionar_peca` | O cliente podia trocar o `id_cliente` do formulário (DevTools) e salvar peça no guarda-roupa de outra pessoa. | Para cliente, o id vem do login. Aceita só arquivo de imagem. |
| `app.py` `/logout` | Só apagava `user_id`; `is_consultora` ficava no cookie. | `session.clear()`. |
| `app.py` | `secret_key` escrita no código. | Lida de `FLASK_SECRET_KEY` no `.env` (com valor reserva). |
| `app.py` `/feed` | Chave `"foto_perfil.jpg"` digitada errada no valor reserva. | Corrigida para `"foto_perfil"`. |
| `app.py` `/excluir_peca` | Erro no Cloudinary devolvia 500 mesmo com a peça já apagada. | Cloudinary em `try` separado. |
| `app.py` `/salvar_look` | Valor não numérico gerava erro 500. | Responde 400 com mensagem. |
| `feed.html`, `perfil.html` | Carregavam `/static/script.js`, que não existe (erro 404). | Removido. |
| `boneco.js` | Peça sem foto apontava para `peca_padrao.png`, que não existe. | Desenho de cabide embutido (`IMAGEM_PADRAO`). |
| `gerenciamento.html` | Carregava o `login.css`, que muda `<header>`, `<main>` e `<nav>` de forma global. | Removido desta tela. |
| `gerenciamento.html` | Campo de senha do cadastro com `autocomplete="current-password"`: o navegador preenchia a senha da consultora. | `new-password`. |

## 2. Novo visual (estilo Instagram, cores originais)

- As **cores e fontes originais** foram mantidas (preto, bege `#f7f5f1`, marrom `#a68a6e`, Bodoni Moda + Jost).
- `static/tema.css` (**novo**): variáveis de cor e componentes da tela da consultora (botões, campos, chips, janelas).
- `templates/gerenciamento.html` + `static/gerenciamento.css` + `static/gerenciamento.js`: reescritos no formato de perfil do Instagram:
  clientes como *stories*, cabeçalho com foto e números, *destaques* por parte do corpo, abas com ícones,
  grade de fotos 3 por linha e detalhe da peça/look aberto como uma publicação.
- Login: continua com o visual original.
- Os arquivos `static/telasCliente.css` e `static/entrar.css` da versão escura não são mais usados e podem ser apagados.

## 3. Filtros

- **Clientes** (círculos no topo): busca por nome/e-mail, filtros *Com looks*, *Sem looks*, *Sem peças*, *Com favoritos*, e ordenação.
- **Peças** (aba Peças e círculos de destaque): busca (nome, categoria, observações), parte do corpo, estação, ocasião, categoria, favoritas, ordenação e *Limpar filtros*.
- **Looks** (galeria): busca (look ou peça), categoria, favoritos e ordenação.

## 4. Telas redesenhadas

- **Resumo (antiga "Gráficos")**: sem biblioteca de gráficos. Só duas listas de barras finas (looks por estação e peças por parte do corpo) e as peças que ainda não foram usadas em nenhum look.
- **Montar look (antiga "Adicionar Looks")**: closet com filtros, manequim novo com **arrastar e soltar**, resumo do look e salvar na mesma tela.
- **Looks**: grade de fotos; ao abrir um look dá para favoritar, *usar como base* ou excluir.
- **Favoritos** (aba nova): looks e peças com estrela.

## 5. Rota nova

- `POST /favoritar_peca/<id>`: liga/desliga a estrela da peça (a coluna `is_favorito` já existia; não precisa mexer no banco).

## 6. Telas da cliente no estilo Instagram

- `templates/feed.html` + `static/cliente.js` (**novo**) + `static/cliente.css` (**novo**): mesmo layout da consultora.
  - **Stories**: um círculo por look; abre em tela cheia, avança sozinho, anel some depois de visto.
  - **Feed**: publicações dos looks (estrela, ver peças) com anúncios *Patrocinado* no meio.
  - **Looks**: grade com busca e filtros (Favoritos e categorias).
  - **Peças**: guarda-roupa da cliente, com destaques por parte do corpo, busca e estação.
  - **Comprar**: roupas sugeridas pela consultora, com preço e botão *Comprar na loja*.
- `templates/perfil.html`: estilo "Editar perfil" do Instagram.
- `templates/adicionarPeca.html` + `static/adicionarPeca.js`: igual à janela "Nova peça" da consultora (prévia da foto, arrastar foto, aviso na tela em vez de `alert`).
- [REVISÃO] o formulário da cliente salvava a estação como `verao`/`inverno`; agora salva `Verão`/`Inverno`, igual à consultora (senão o filtro de estação não achava as peças).
- `static/looksCliente.js` e `static/looksCliente.css` não são mais usados pelo feed.

## 7. Anúncios (roupas para comprar)

- Tabela nova **`anuncio`** no Supabase (já criada; SQL em `backend/migracao_anuncios.sql`).
- Tela da consultora: ícone de **sacola** na barra superior → cadastrar anúncio (foto ou link da imagem, nome, loja, preço, link da loja, parte do corpo, para todas as clientes ou só para a selecionada), pausar e excluir.
- Rotas novas: `GET /anuncios`, `POST /adicionar_anuncio`, `POST /alternar_anuncio/<id>`, `POST /excluir_anuncio/<id>` e `GET /minhas_pecas`.

## 8. Visual do look em colagem + dados de exemplo  [NOVO VISUAL]

- **Look em colagem** (`static/boneco.js` → `montarBoneco`, `static/boneco.css` seção 1):
  as fotos não ficam mais "jogadas". Cada look vira uma grade quadrada de cartões
  bege com cantos arredondados; a peça principal (parte de cima) ocupa mais espaço.
  Ordem: parte de cima, parte de baixo, calçados, cabeça, acessórios. Mais de 9
  peças mostra 8 + um cartão "+N". Vale para feed, grade, story e detalhe.
- **Nome de quem montou o look em destaque**: "Isabela Andrade" aparece na cor bege
  (`--destaque`) em negrito, com selo de verificado e foto com anel em degradê
  (`.nomeConsultora`, `.seloConsultora`, `.fotoConsultora` em `static/cliente.css`).
- **Foto genérica**: `static/img/avatar_generico.svg`. No Supabase, todo usuário
  sem foto passou a apontar para ela.
- **Dados de exemplo no Supabase** (projeto "consulta"):
  - todo cliente ficou com 50 peças (cópias variadas de estação e ocasião);
  - clientes que não tinham looks ganharam 5 looks cada (com peças, categorias
    e notificação): Casual de fim de semana, Reunião importante, Jantar especial,
    Noite de festa, Passeio de primavera.

## Para fazer depois

- Criar `FLASK_SECRET_KEY=<um texto longo e aleatório>` no `.env`.
- "Esqueci minha senha" e as linhas do perfil continuam sem ação (já eram assim).
