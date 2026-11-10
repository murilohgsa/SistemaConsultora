/* =====================================================================
   TELA DA CLIENTE (feed) — estilo Instagram
   ---------------------------------------------------------------------
   [NOVO] Substitui o looksCliente.js nesta tela. Seções:

     1. UTILITÁRIOS ......... funções pequenas usadas em todo o arquivo
     2. ESTADO .............. looks, peças e anúncios carregados do Flask
     3. ABAS ................ FEED | LOOKS | PEÇAS | COMPRAR
     4. STORIES ............. círculos dos looks + visualizador em tela cheia
     5. FEED ................ publicações dos looks com anúncios no meio
     6. LOOKS ............... grade + busca + filtros
     7. PEÇAS ............... grade + destaques por parte do corpo + busca
     8. COMPRAR ............. grade dos anúncios + filtro por parte do corpo
     9. DETALHE (POST) ...... janela de look, peça ou anúncio
    10. INÍCIO .............. busca os dados e liga tudo

   Rotas usadas (app.py):
     GET  /meus_looks       looks da cliente logada
     GET  /minhas_pecas     [NOVO] peças da cliente logada
     GET  /anuncios         [NOVO] roupas para comprar (só as ativas para ela)
     POST /favoritar_look/<id>

   Depende do static/boneco.js (PARTES_CORPO, ICONES_PARTES, IMAGEM_PADRAO,
   escaparHtml, montarBoneco), carregado antes no HTML.
   ===================================================================== */


/* =====================================================================
   1. UTILITÁRIOS
   ===================================================================== */

const $ = id => document.getElementById(id);

// Tira acentos e deixa minúsculo: assim "calca" encontra "Calça" na busca
function normalizar(texto) {
  return (texto || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function plural(qtd, singular, pluralTexto) {
  return `${qtd} ${qtd === 1 ? singular : pluralTexto}`;
}

// "há 3 dias", "há 2 horas" — como a data das publicações do Instagram
function dataRelativa(iso) {
  const data = new Date(iso);
  if (!iso || isNaN(data)) return '';
  const minutos = Math.floor((Date.now() - data) / 60000);
  if (minutos < 60) return minutos <= 1 ? 'agora' : `há ${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${plural(horas, 'hora', 'horas')}`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `há ${plural(dias, 'dia', 'dias')}`;
  return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

// 129.9 -> "R$ 129,90"
function formatarPreco(valor) {
  if (valor === null || valor === undefined) return '';
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Só deixa usar links http(s) dentro de href (segurança)
function linkSeguro(url) {
  return /^https?:\/\//i.test(url || '') ? url : '';
}

let timerToast = null;
function mostrarToast(texto) {
  const toast = $('toast');
  toast.textContent = texto;
  toast.classList.add('visivel');
  clearTimeout(timerToast);
  timerToast = setTimeout(() => toast.classList.remove('visivel'), 2600);
}

// Guarda no navegador quais stories a cliente já viu (o anel some).
// try/catch: o navegador pode bloquear o armazenamento (aba anônima etc.).
function lerVistos() {
  try { return JSON.parse(localStorage.getItem('ia_storiesVistos') || '[]'); } catch (e) { return []; }
}
function marcarVisto(idLook) {
  const vistos = lerVistos();
  if (vistos.includes(idLook)) return;
  vistos.push(idLook);
  try { localStorage.setItem('ia_storiesVistos', JSON.stringify(vistos.slice(-200))); } catch (e) { /* ignora */ }
}

// Ícones de linha fina, iguais aos da tela da consultora
const ICONE_ESTRELA = '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.4 5.9.9-4.3 4.2 1 6-5.2-2.8-5.2 2.8 1-6-4.3-4.2 5.9-.9Z"/></svg>';
const ICONE_CABIDE = '<svg viewBox="0 0 24 24"><path d="M12 7a2 2 0 1 1 2-2c0 1-1 1.5-2 2.2V9l9 6c1 .7.6 2-.6 2H3.6c-1.2 0-1.6-1.3-.6-2l9-6"/></svg>';
const ICONE_SACOLA = '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>';
const ICONE_SETA = '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';
const FOTO_CONSULTORA = '/static/img/avatar_generico.svg';

// [NOVO VISUAL] Nome de quem montou o look, em DESTAQUE: cor bege/marrom do
// sistema + selo de "consultora" (como o selo de verificado do Instagram).
// Usado no feed, no detalhe do look e no story.
const NOME_CONSULTORA = `<strong class="nomeConsultora">Isabela Andrade<svg class="seloConsultora" viewBox="0 0 24 24" aria-label="Consultora"><path d="M12 2l2.4 2.1 3.2-.4.9 3.1 2.8 1.6-1.2 3 1.2 3-2.8 1.6-.9 3.1-3.2-.4L12 22l-2.4-2.1-3.2.4-.9-3.1-2.8-1.6 1.2-3-1.2-3 2.8-1.6.9-3.1 3.2.4Z"/><path class="check" d="M8.5 12.2l2.4 2.4 4.6-4.8"/></svg></strong>`;


/* =====================================================================
   2. ESTADO
   ===================================================================== */

var looks = [];          // de /meus_looks
var pecas = [];          // de /minhas_pecas
var anuncios = [];       // de /anuncios

const filtroLooks = { texto: '', tipo: 'todos' };            // tipo: todos | favoritos | id da categoria
const filtroPecas = { texto: '', parte: 'todas', estacao: '' };
const filtroComprar = { parte: 'todas' };

function buscarLook(id) { return looks.find(l => l.id_look === Number(id)); }
function buscarPeca(id) { return pecas.find(p => p.id_peca === Number(id)); }
function buscarAnuncio(id) { return anuncios.find(a => a.id_anuncio === Number(id)); }
function parteDaPeca(peca) { return PARTES_CORPO[peca.parte_corpo] ? Number(peca.parte_corpo) : 5; }

function atualizarNumeros() {
  $('numLooks').textContent = looks.length;
  $('numPecas').textContent = pecas.length;
  $('numFavoritos').textContent = looks.filter(l => l.is_favorito).length;
}


/* =====================================================================
   3. ABAS
   ===================================================================== */

function abaAtiva() {
  const aba = document.querySelector('.abaPerfil[aria-selected="true"]');
  return aba ? aba.dataset.aba : 'feed';
}

function trocarAba(nome) {
  document.querySelectorAll('.abaPerfil').forEach(aba => aba.setAttribute('aria-selected', aba.dataset.aba === nome));
  document.querySelectorAll('.painelAba').forEach(p => { p.hidden = p.id !== 'painel-' + nome; });
  try { sessionStorage.setItem('ia_abaCliente', nome); } catch (e) { /* ignora */ }
  renderizarAbaAtiva();
}

function renderizarAbaAtiva() {
  const aba = abaAtiva();
  if (aba === 'feed') renderizarFeed();
  if (aba === 'looks') renderizarLooks();
  if (aba === 'pecas') renderizarPecas();
  if (aba === 'comprar') renderizarComprar();
}

function iniciarAbas() {
  document.querySelectorAll('.abaPerfil').forEach(aba => aba.addEventListener('click', () => trocarAba(aba.dataset.aba)));
  // botões fora das abas que levam a uma aba (ex.: a sacola da barra superior)
  document.querySelectorAll('[data-ir-aba]').forEach(botao => botao.addEventListener('click', () => {
    trocarAba(botao.dataset.irAba);
    document.querySelector('.abasPerfil').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  let salva = null;
  try { salva = sessionStorage.getItem('ia_abaCliente'); } catch (e) { /* ignora */ }
  if (salva && $('painel-' + salva)) trocarAba(salva);
}


/* =====================================================================
   4. STORIES  [NOVO]
   ---------------------------------------------------------------------
   Cada look vira um círculo no topo, com a foto da peça principal.
   Clicar abre o visualizador em tela cheia: barrinhas de progresso no
   topo, o look no meio e as peças embaixo. Ele avança sozinho a cada
   6 segundos; tocar à direita avança, à esquerda volta, ESC fecha.
   ===================================================================== */

const TEMPO_STORY = 6000;
let indiceStory = 0;
let timerStory = null;

// foto do círculo: a peça de cima (tronco) do look, ou a primeira que houver
function capaDoLook(look) {
  const principal = look.pecas.find(p => Number(p.parte_corpo) === 2) || look.pecas[0];
  return principal && principal.imagem ? principal.imagem : IMAGEM_PADRAO;
}

function renderizarStories() {
  const lista = $('storiesLooks');
  if (looks.length === 0) {
    lista.innerHTML = '<li class="semStories">Seus looks vão aparecer aqui.</li>';
    return;
  }
  const vistos = lerVistos();
  lista.innerHTML = looks.map((look, i) => `
    <li>
      <button class="story" type="button" data-indice="${i}" aria-label="Ver o look ${escaparHtml(look.titulo)}">
        <span class="anelStory ${vistos.includes(look.id_look) ? 'semAnel' : ''}">
          <span class="fotoStory fotoStoryLook"><img src="${capaDoLook(look)}" alt="" loading="lazy"></span>
        </span>
        <span class="nomeStory">${escaparHtml(look.titulo)}</span>
      </button>
    </li>`).join('');
  lista.querySelectorAll('.story').forEach(b => b.addEventListener('click', () => abrirStory(Number(b.dataset.indice))));
}

function abrirStory(indice) {
  indiceStory = indice;
  $('visualizadorStory').hidden = false;
  document.body.classList.add('semRolagem');
  mostrarStory();
}

function fecharStory() {
  clearTimeout(timerStory);
  $('visualizadorStory').hidden = true;
  document.body.classList.remove('semRolagem');
  renderizarStories();   // atualiza os anéis (os vistos ficam cinza)
}

function mostrarStory() {
  const look = looks[indiceStory];
  if (!look) { fecharStory(); return; }
  marcarVisto(look.id_look);

  // barrinhas: as anteriores cheias, a atual enchendo (animação no CSS), as próximas vazias
  $('barrasStory').innerHTML = looks.map((_, i) => `
    <span class="barraStory ${i < indiceStory ? 'cheia' : ''}">
      <span class="${i === indiceStory ? 'enchendo' : ''}" style="animation-duration:${TEMPO_STORY}ms"></span>
    </span>`).join('');
  $('tempoStory').textContent = dataRelativa(look.data);

  $('conteudoStory').innerHTML = `
    <div class="lookStory">${montarBoneco(look.pecas)}</div>
    <div class="legendaStory">
      <strong>${escaparHtml(look.titulo)}</strong>
      ${look.categorias.length ? `<span>${look.categorias.map(c => '#' + escaparHtml(c.nome.replace(/\s+/g, ''))).join(' ')}</span>` : ''}
      <button class="botao botaoSecundario" type="button" id="verLookStory">Ver peças do look</button>
    </div>`;
  $('verLookStory').addEventListener('click', () => { fecharStory(); abrirPostLook(look.id_look); });

  clearTimeout(timerStory);
  timerStory = setTimeout(proximoStory, TEMPO_STORY);
}

function proximoStory() {
  if (indiceStory < looks.length - 1) { indiceStory++; mostrarStory(); } else fecharStory();
}
function storyAnterior() {
  if (indiceStory > 0) indiceStory--;
  mostrarStory();
}

function iniciarStories() {
  $('fecharStory').addEventListener('click', fecharStory);
  $('avancarStory').addEventListener('click', proximoStory);
  $('voltarStory').addEventListener('click', storyAnterior);
  document.addEventListener('keydown', e => {
    if ($('visualizadorStory').hidden) return;
    if (e.key === 'Escape') fecharStory();
    if (e.key === 'ArrowRight') proximoStory();
    if (e.key === 'ArrowLeft') storyAnterior();
  });
}


/* =====================================================================
   5. FEED  [NOVO]
   ---------------------------------------------------------------------
   Publicações dos looks, uma embaixo da outra (como a página inicial do
   Instagram). A cada 2 looks entra um anúncio "Patrocinado" de roupa
   para comprar, se a consultora tiver cadastrado algum.
   ===================================================================== */

const LOOKS_ENTRE_ANUNCIOS = 2;

function postLook(look) {
  return `
    <article class="post" data-id="${look.id_look}">
      <header class="cabecalhoPostFeed">
        <span class="fotoAutor fotoConsultora"><img src="${FOTO_CONSULTORA}" alt=""></span>
        <span class="autorFeed">${NOME_CONSULTORA}<small>Consultora de imagem · montou este look</small></span>
      </header>
      <button class="midiaFeed" type="button" data-abrir-look="${look.id_look}" aria-label="Ver as peças do look ${escaparHtml(look.titulo)}">
        ${montarBoneco(look.pecas)}
      </button>
      <div class="acoesFeed">
        <button class="botaoIcone ${look.is_favorito ? 'favoritado' : ''}" type="button" data-favoritar="${look.id_look}"
                aria-pressed="${!!look.is_favorito}" aria-label="Favoritar">${ICONE_ESTRELA}</button>
        <button class="botaoIcone" type="button" data-abrir-look="${look.id_look}" aria-label="Ver peças">${ICONE_CABIDE}</button>
      </div>
      <div class="legendaFeed">
        <p><strong>${escaparHtml(look.titulo)}</strong> ${plural(look.pecas.length, 'peça', 'peças')} do seu guarda-roupa</p>
        ${look.categorias.length ? `<p class="hashtags">${look.categorias.map(c => '#' + escaparHtml(c.nome.replace(/\s+/g, ''))).join(' ')}</p>` : ''}
        <button class="verPecas" type="button" data-abrir-look="${look.id_look}">Ver as ${plural(look.pecas.length, 'peça', 'peças')}</button>
        <time datetime="${escaparHtml(look.data || '')}">${dataRelativa(look.data)}</time>
      </div>
    </article>`;
}

// Anúncio no meio do feed: foto grande + faixa "Comprar" (como os anúncios do Instagram)
function postAnuncio(anuncio) {
  const link = linkSeguro(anuncio.link);
  return `
    <article class="post postAnuncio">
      <header class="cabecalhoPostFeed">
        <span class="fotoAutor iconeLoja">${ICONE_SACOLA}</span>
        <span class="autorFeed"><strong>${escaparHtml(anuncio.loja || 'Sugestão de compra')}</strong><small>Patrocinado</small></span>
      </header>
      <button class="midiaFeed midiaAnuncio" type="button" data-abrir-anuncio="${anuncio.id_anuncio}" aria-label="Ver ${escaparHtml(anuncio.titulo)}">
        <img src="${escaparHtml(anuncio.imagem)}" alt="" loading="lazy">
      </button>
      ${link
        ? `<a class="faixaComprar" href="${escaparHtml(link)}" target="_blank" rel="noopener noreferrer">Comprar ${ICONE_SETA}</a>`
        : `<button class="faixaComprar" type="button" data-abrir-anuncio="${anuncio.id_anuncio}">Saiba mais ${ICONE_SETA}</button>`}
      <div class="legendaFeed">
        <p><strong>${escaparHtml(anuncio.titulo)}</strong>${anuncio.preco !== null ? ` · ${formatarPreco(anuncio.preco)}` : ''}</p>
        ${anuncio.descricao ? `<p>${escaparHtml(anuncio.descricao)}</p>` : ''}
      </div>
    </article>`;
}

function renderizarFeed() {
  const lista = $('listaPosts');
  if (looks.length === 0 && anuncios.length === 0) {
    lista.innerHTML = `
      <div class="estadoVazio">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="4.5" r="2.5"/><path d="M8 21l1-9-3-4h12l-3 4 1 9"/></svg>
        <strong>Ainda não há looks</strong>
        <span>Quando a sua consultora montar um look, ele aparece aqui.</span>
      </div>`;
    return;
  }

  // intercala: look, look, anúncio, look, look, anúncio... (anúncios que sobrarem vão no fim)
  const partes = [];
  let a = 0;
  looks.forEach((look, i) => {
    partes.push(postLook(look));
    if ((i + 1) % LOOKS_ENTRE_ANUNCIOS === 0 && anuncios[a]) partes.push(postAnuncio(anuncios[a++]));
  });
  while (a < anuncios.length && a < 3) partes.push(postAnuncio(anuncios[a++]));
  lista.innerHTML = partes.join('');
  ligarBotoes(lista);
}

// Liga os botões de abrir/favoritar dentro de um container (feed, grades, post)
function ligarBotoes(container) {
  container.querySelectorAll('[data-abrir-look]').forEach(b => b.addEventListener('click', () => abrirPostLook(b.dataset.abrirLook)));
  container.querySelectorAll('[data-abrir-anuncio]').forEach(b => b.addEventListener('click', () => abrirPostAnuncio(b.dataset.abrirAnuncio)));
  container.querySelectorAll('[data-abrir-peca]').forEach(b => b.addEventListener('click', () => abrirPostPeca(b.dataset.abrirPeca)));
  container.querySelectorAll('[data-favoritar]').forEach(b => b.addEventListener('click', () => favoritarLook(b.dataset.favoritar)));
}

async function favoritarLook(idLook) {
  const look = buscarLook(idLook);
  if (!look) return;
  try {
    const res = await fetch(`/favoritar_look/${idLook}`, { method: 'POST' });
    if (!res.ok) throw new Error();
    const dados = await res.json();
    look.is_favorito = dados.is_favorito;
    mostrarToast(dados.is_favorito ? 'Look salvo nos favoritos' : 'Look removido dos favoritos');
    atualizarNumeros();
    renderizarAbaAtiva();
    // se o detalhe estiver aberto, redesenha para a estrela mudar lá também
    if ($('modalPost').classList.contains('aberto')) abrirPostLook(idLook);
  } catch {
    mostrarToast('Não foi possível favoritar o look.');
  }
}


/* =====================================================================
   6. LOOKS — grade + busca + filtros
   ===================================================================== */

// Chips: Todos, Favoritos e só as categorias que os looks desta cliente usam
function renderizarFiltrosLooks() {
  const usadas = new Map();
  looks.forEach(l => l.categorias.forEach(c => usadas.set(String(c.id_categoria_look), c.nome)));
  const chips = [['todos', 'Todos'], ['favoritos', '★ Favoritos'], ...usadas.entries()];
  $('filtrosLooks').innerHTML = chips.map(([valor, nome]) =>
    `<button class="chip" type="button" data-tipo="${escaparHtml(valor)}" aria-pressed="${filtroLooks.tipo === valor}">${escaparHtml(nome)}</button>`
  ).join('');
  $('filtrosLooks').querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => {
    filtroLooks.tipo = chip.dataset.tipo;
    renderizarLooks();
  }));
}

function looksFiltrados() {
  const busca = normalizar(filtroLooks.texto);
  return looks.filter(look => {
    if (filtroLooks.tipo === 'favoritos' && !look.is_favorito) return false;
    if (!['todos', 'favoritos'].includes(filtroLooks.tipo) &&
        !look.categorias.some(c => String(c.id_categoria_look) === filtroLooks.tipo)) return false;
    if (busca) {
      const textos = [look.titulo, ...look.pecas.map(p => p.titulo), ...look.categorias.map(c => c.nome)];
      if (!textos.some(t => normalizar(t).includes(busca))) return false;
    }
    return true;
  });
}

function tileLook(look) {
  return `
    <button class="tileFoto tileLook" type="button" data-abrir-look="${look.id_look}" aria-label="Abrir o look ${escaparHtml(look.titulo)}">
      <span class="bonecoTile">${montarBoneco(look.pecas)}</span>
      ${look.is_favorito ? `<span class="marcaTile" aria-hidden="true">${ICONE_ESTRELA}</span>` : ''}
      <span class="camadaTile"><strong>${escaparHtml(look.titulo)}</strong><span>${plural(look.pecas.length, 'peça', 'peças')}</span></span>
    </button>`;
}

function renderizarLooks() {
  renderizarFiltrosLooks();
  const grade = $('gradeLooks');
  const lista = looksFiltrados();
  $('contagemLooks').textContent = plural(lista.length, 'look', 'looks');
  grade.innerHTML = lista.length
    ? lista.map(tileLook).join('')
    : `<div class="estadoVazio"><strong>${looks.length ? 'Nenhum look encontrado' : 'Ainda não há looks'}</strong>
       <span>${looks.length ? 'Tente outro filtro.' : 'Quando a sua consultora montar um look, ele aparece aqui.'}</span></div>`;
  ligarBotoes(grade);
}


/* =====================================================================
   7. PEÇAS — guarda-roupa da cliente
   ===================================================================== */

function renderizarDestaquesPecas() {
  const lista = $('destaquesPecas');
  lista.innerHTML = Object.entries(PARTES_CORPO).map(([parte, nome]) => {
    const daParte = pecas.filter(p => parteDaPeca(p) === Number(parte));
    const capa = daParte[0];
    return `
      <li>
        <button class="destaque ${filtroPecas.parte === parte ? 'ativo' : ''}" type="button" data-parte="${parte}"
                aria-label="${nome}: ${plural(daParte.length, 'peça', 'peças')}">
          <span class="circuloDestaque">
            ${capa ? `<img src="${capa.imagem || IMAGEM_PADRAO}" alt="" loading="lazy">` : `<span class="iconeDestaque">${ICONES_PARTES[parte]}</span>`}
          </span>
          <span class="nomeDestaque">${nome}</span>
        </button>
      </li>`;
  }).join('');
  lista.querySelectorAll('.destaque').forEach(b => b.addEventListener('click', () => {
    // clicar de novo no destaque ativo tira o filtro
    filtroPecas.parte = filtroPecas.parte === b.dataset.parte ? 'todas' : b.dataset.parte;
    renderizarPecas();
  }));
}

function renderizarPecas() {
  renderizarDestaquesPecas();
  const busca = normalizar(filtroPecas.texto);
  const lista = pecas.filter(p => {
    if (filtroPecas.parte !== 'todas' && parteDaPeca(p) !== Number(filtroPecas.parte)) return false;
    if (filtroPecas.estacao && normalizar(p.estacao) !== normalizar(filtroPecas.estacao)) return false;
    if (busca && !normalizar([p.titulo, p.categoria_nome, p.observacoes].join(' ')).includes(busca)) return false;
    return true;
  });
  $('contagemPecas').textContent = plural(lista.length, 'peça', 'peças') +
    (filtroPecas.parte !== 'todas' ? ` em ${PARTES_CORPO[filtroPecas.parte].toLowerCase()}` : '');

  const grade = $('gradePecas');
  grade.innerHTML = lista.length
    ? lista.map(p => `
        <button class="tileFoto" type="button" data-abrir-peca="${p.id_peca}" aria-label="Abrir ${escaparHtml(p.titulo)}">
          <img src="${p.imagem || IMAGEM_PADRAO}" alt="" loading="lazy">
          <span class="camadaTile"><strong>${escaparHtml(p.titulo)}</strong><span>${escaparHtml(p.categoria_nome)}</span></span>
        </button>`).join('')
    : `<div class="estadoVazio">${ICONE_CABIDE}<strong>${pecas.length ? 'Nenhuma peça encontrada' : 'Ainda não há peças'}</strong>
       <span>${pecas.length ? 'Tente outro filtro.' : 'Adicione as peças do seu guarda-roupa.'}</span>
       ${pecas.length ? '' : '<a class="botao botaoTexto" href="/adicionar">Adicionar peça</a>'}</div>`;
  ligarBotoes(grade);
}

function iniciarFiltros() {
  $('buscaLooks').addEventListener('input', e => { filtroLooks.texto = e.target.value; renderizarLooks(); });
  $('buscaPecas').addEventListener('input', e => { filtroPecas.texto = e.target.value; renderizarPecas(); });
  $('filtroEstacaoPecas').addEventListener('change', e => { filtroPecas.estacao = e.target.value; renderizarPecas(); });
}


/* =====================================================================
   8. COMPRAR — roupas sugeridas pela consultora  [NOVO]
   ===================================================================== */

function renderizarComprar() {
  // chips de parte do corpo (só as partes que têm anúncio)
  const partesUsadas = [...new Set(anuncios.map(a => a.parte_corpo).filter(p => PARTES_CORPO[p]))].sort();
  $('filtrosComprar').innerHTML = [['todas', 'Tudo'], ...partesUsadas.map(p => [String(p), PARTES_CORPO[p]])]
    .map(([valor, nome]) => `<button class="chip" type="button" data-parte="${valor}" aria-pressed="${filtroComprar.parte === valor}">${nome}</button>`)
    .join('');
  $('filtrosComprar').hidden = partesUsadas.length === 0;
  $('filtrosComprar').querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => {
    filtroComprar.parte = chip.dataset.parte;
    renderizarComprar();
  }));

  const lista = anuncios.filter(a => filtroComprar.parte === 'todas' || String(a.parte_corpo) === filtroComprar.parte);
  const grade = $('gradeComprar');
  grade.innerHTML = lista.length
    ? lista.map(a => `
        <button class="tileFoto tileAnuncio" type="button" data-abrir-anuncio="${a.id_anuncio}" aria-label="Ver ${escaparHtml(a.titulo)}">
          <img src="${escaparHtml(a.imagem)}" alt="" loading="lazy">
          ${a.preco !== null ? `<span class="precoTile">${formatarPreco(a.preco)}</span>` : ''}
          <span class="camadaTile"><strong>${escaparHtml(a.titulo)}</strong><span>${escaparHtml(a.loja || '')}</span></span>
        </button>`).join('')
    : `<div class="estadoVazio">${ICONE_SACOLA}<strong>Nenhuma sugestão por enquanto</strong>
       <span>Quando a sua consultora indicar roupas para comprar, elas aparecem aqui.</span></div>`;
  ligarBotoes(grade);
}


/* =====================================================================
   9. DETALHE (POST) — mesma janela da tela da consultora
   ===================================================================== */

function abrirModalPost() {
  $('modalPost').classList.add('aberto');
}
function fecharModalPost() {
  $('modalPost').classList.remove('aberto');
}

function cabecalhoConsultora() {
  return `<div class="autorPost"><span class="fotoAutor fotoConsultora"><img src="${FOTO_CONSULTORA}" alt=""></span>
    <span class="autorFeed">${NOME_CONSULTORA}<small>Consultora de imagem</small></span></div>`;
}

function abrirPostLook(idLook) {
  const look = buscarLook(idLook);
  if (!look) return;
  $('conteudoPost').innerHTML = `
    <div class="midiaPost midiaLook">${montarBoneco(look.pecas)}</div>
    <div class="ladoPost">
      ${cabecalhoConsultora()}
      <div class="textoPost">
        <h2>${escaparHtml(look.titulo)}</h2>
        <div class="chipsPost">${look.categorias.map(c => `<span class="etiqueta">${escaparHtml(c.nome)}</span>`).join('')}</div>
        <span class="rotuloSecao">Peças do look</span>
        <ul class="pecasPost">
          ${look.pecas.map(p => `
            <li>
              <img src="${p.imagem || IMAGEM_PADRAO}" alt="">
              <span><strong>${escaparHtml(p.titulo)}</strong><small>${escaparHtml(p.categoria_nome)} · ${PARTES_CORPO[parteDaPeca(p)]}</small></span>
            </li>`).join('')}
        </ul>
      </div>
      <div class="acoesPost">
        <button class="botaoIcone ${look.is_favorito ? 'favoritado' : ''}" type="button" data-favoritar="${look.id_look}"
                aria-pressed="${!!look.is_favorito}" aria-label="Favoritar" title="Favoritar">${ICONE_ESTRELA}</button>
      </div>
      <span class="dataPost">${dataRelativa(look.data)}</span>
    </div>`;
  ligarBotoes($('conteudoPost'));
  abrirModalPost();
}

function abrirPostPeca(idPeca) {
  const peca = buscarPeca(idPeca);
  if (!peca) return;
  const emLooks = looks.filter(l => l.pecas.some(p => p.id_peca === peca.id_peca));
  $('conteudoPost').innerHTML = `
    <div class="midiaPost"><img src="${peca.imagem || IMAGEM_PADRAO}" alt="${escaparHtml(peca.titulo)}"></div>
    <div class="ladoPost">
      ${cabecalhoConsultora()}
      <div class="textoPost">
        <h2>${escaparHtml(peca.titulo)}</h2>
        <dl class="dadosPost">
          <dt>Categoria</dt><dd>${escaparHtml(peca.categoria_nome)}</dd>
          <dt>Parte do corpo</dt><dd>${PARTES_CORPO[parteDaPeca(peca)]}</dd>
          <dt>Estação</dt><dd>${escaparHtml(peca.estacao || '—')}</dd>
          <dt>Ocasião</dt><dd>${escaparHtml(peca.ocasiao || '—')}</dd>
        </dl>
        ${peca.observacoes ? `<p class="obsPost">${escaparHtml(peca.observacoes)}</p>` : ''}
        <span class="rotuloSecao">${emLooks.length ? 'Aparece nos looks' : 'Ainda não aparece em nenhum look'}</span>
        <ul class="pecasPost">
          ${emLooks.map(l => `<li><button class="linkLook" type="button" data-abrir-look="${l.id_look}">${escaparHtml(l.titulo)}</button></li>`).join('')}
        </ul>
      </div>
    </div>`;
  ligarBotoes($('conteudoPost'));
  abrirModalPost();
}

function abrirPostAnuncio(idAnuncio) {
  const anuncio = buscarAnuncio(idAnuncio);
  if (!anuncio) return;
  const link = linkSeguro(anuncio.link);
  $('conteudoPost').innerHTML = `
    <div class="midiaPost"><img src="${escaparHtml(anuncio.imagem)}" alt="${escaparHtml(anuncio.titulo)}"></div>
    <div class="ladoPost">
      <div class="autorPost"><span class="fotoAutor iconeLoja">${ICONE_SACOLA}</span>
        <span class="autorFeed"><strong>${escaparHtml(anuncio.loja || 'Sugestão de compra')}</strong><small>Patrocinado</small></span></div>
      <div class="textoPost">
        <h2>${escaparHtml(anuncio.titulo)}</h2>
        ${anuncio.preco !== null ? `<p class="precoPost">${formatarPreco(anuncio.preco)}</p>` : ''}
        ${anuncio.descricao ? `<p class="obsPost">${escaparHtml(anuncio.descricao)}</p>` : ''}
        ${PARTES_CORPO[anuncio.parte_corpo] ? `<span class="etiqueta">${PARTES_CORPO[anuncio.parte_corpo]}</span>` : ''}
      </div>
      ${link ? `<div class="rodapeAnuncio"><a class="botao botaoPrimario botaoLargo" href="${escaparHtml(link)}" target="_blank" rel="noopener noreferrer">Comprar na loja</a></div>` : ''}
    </div>`;
  abrirModalPost();
}

function iniciarModal() {
  $('modalPost').addEventListener('click', e => { if (e.target === $('modalPost')) fecharModalPost(); });
  document.querySelector('#modalPost [data-fechar-modal]').addEventListener('click', fecharModalPost);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharModalPost(); });
}

// Usado pelo notificacoes.js: clicar numa notificação abre o look aqui mesmo
window.abrirLookCliente = idLook => {
  if (buscarLook(idLook)) abrirPostLook(idLook);
};


/* =====================================================================
   10. INÍCIO
   As três buscas acontecem ao mesmo tempo (Promise.all). Se uma falhar
   (ex.: anúncios), as outras continuam aparecendo.
   ===================================================================== */

function buscarJson(url) {
  return fetch(url).then(res => (res.ok ? res.json() : [])).catch(() => []);
}

async function carregarTudo() {
  [looks, pecas, anuncios] = await Promise.all([buscarJson('/meus_looks'), buscarJson('/minhas_pecas'), buscarJson('/anuncios')]);
  atualizarNumeros();
  renderizarStories();
  renderizarAbaAtiva();

  // link de notificação de outra tela: /feed?look=12 abre aquele look
  const idDaUrl = new URLSearchParams(window.location.search).get('look');
  if (idDaUrl) abrirPostLook(idDaUrl);
}

iniciarModal();
iniciarAbas();
iniciarStories();
iniciarFiltros();
carregarTudo();
