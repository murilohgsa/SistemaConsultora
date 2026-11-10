/* =====================================================================
   GERENCIAMENTO (tela da consultora) — estilo Instagram
   ---------------------------------------------------------------------
   [NOVO] Arquivo reescrito junto com o novo visual. Seções:

     1. UTILITÁRIOS ............ funções pequenas usadas em todo o arquivo
     2. JANELAS (MODAIS) ....... abrir/fechar qualquer modal
     3. ESTADO ................. dados do cliente ativo, guardados em memória
     4. FILTRO DE CLIENTES ..... busca, chips e ordenação dos "stories"
     5. CLIENTE ATIVO .......... trocar de cliente, carregar peças e looks
     6. ABAS ................... PEÇAS | LOOKS | MONTAR LOOK | FAVORITOS | RESUMO
     7. CABEÇALHO E DESTAQUES .. números do perfil e círculos das partes do corpo
     8. PEÇAS .................. grade de fotos + FILTRO DE PEÇAS
     9. DETALHE (POST) ......... janela que abre ao clicar numa foto
    10. CATEGORIAS DE PEÇA ..... cadastro e lista por parte do corpo
    11. MONTAR LOOK ............ closet + manequim com ARRASTAR E SOLTAR + salvar
    12. LOOKS .................. grade de looks + FILTRO DE LOOKS
    13. FAVORITOS E RESUMO ..... aba de favoritos e resumo simples (sem gráficos)
    14. CADASTROS E EXCLUSÕES .. cliente, peça, look
   14b. ANÚNCIOS ............... roupas para comprar (feed das clientes)
    15. INÍCIO ................. liga tudo quando a página abre

   Melhoria de desempenho: as peças e os looks do cliente são buscados UMA
   vez (carregarDadosCliente) e todas as abas usam a mesma informação.
   Antes, cada aba buscava tudo de novo no servidor.

   Depende do static/boneco.js (PARTES_CORPO, ICONES_PARTES, IMAGEM_PADRAO,
   escaparHtml, montarBoneco, montarManequim), carregado antes no HTML.
   ===================================================================== */


/* =====================================================================
   1. UTILITÁRIOS
   ===================================================================== */

// Atalho para document.getElementById
const $ = id => document.getElementById(id);

// Tira acentos e deixa minúsculo: assim "calca" encontra "Calça" na busca
function normalizar(texto) {
  return (texto || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// "1 peça" / "3 peças"
function plural(qtd, singular, pluralTexto) {
  return `${qtd} ${qtd === 1 ? singular : pluralTexto}`;
}

// Data do banco (ISO) -> "12 de novembro de 2026"
function formatarData(iso) {
  if (!iso) return '';
  const data = new Date(iso);
  return isNaN(data) ? '' : data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Conta quantas vezes cada valor aparece: contar(['a','b','a']) -> {a:2, b:1}
function contar(lista) {
  return lista.reduce((acc, chave) => { acc[chave] = (acc[chave] || 0) + 1; return acc; }, {});
}

// Aviso rápido na parte de baixo da tela (some sozinho), como no Instagram
let timerToast = null;
function mostrarToast(texto) {
  const toast = $('toast');
  toast.textContent = texto;
  toast.classList.add('visivel');
  clearTimeout(timerToast);
  timerToast = setTimeout(() => toast.classList.remove('visivel'), 2600);
}

// Mensagem verde/vermelha dentro de formulários
function mostrarMensagem(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = `msgRetorno ${tipo}`;
  elemento.hidden = false;
}

// Guarda/lê no navegador o cliente e a aba abertos (a página recarrega ao
// cadastrar peça). try/catch: o navegador pode bloquear o armazenamento.
function salvarPreferencia(chave, valor) {
  try { sessionStorage.setItem('ia_' + chave, valor); } catch (e) { /* ignora */ }
}
function lerPreferencia(chave) {
  try { return sessionStorage.getItem('ia_' + chave); } catch (e) { return null; }
}

// Ícones (SVG de linha fina, como os do Instagram) usados nas fotos e no detalhe
const ICONE_ESTRELA = '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.4 5.9.9-4.3 4.2 1 6-5.2-2.8-5.2 2.8 1-6-4.3-4.2 5.9-.9Z"/></svg>';
const ICONE_LIXEIRA = '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
const ICONE_COPIAR = '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
const ICONE_CABIDE = '<svg viewBox="0 0 24 24"><path d="M12 7a2 2 0 1 1 2-2c0 1-1 1.5-2 2.2V9l9 6c1 .7.6 2-.6 2H3.6c-1.2 0-1.6-1.3-.6-2l9-6"/></svg>';

const ESTACOES = ['Primavera', 'Verão', 'Outono', 'Inverno'];


/* =====================================================================
   2. JANELAS (MODAIS)
   ---------------------------------------------------------------------
   Todas usam a classe .modal; abrir = colocar .aberto.
   - botão com data-fechar-modal fecha a janela em que está
   - clicar no fundo escuro ou apertar ESC também fecha
   ===================================================================== */

function abrirModal(id) {
  $(id).classList.add('aberto');
  const primeiroCampo = $(id).querySelector('input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio])');
  if (primeiroCampo) setTimeout(() => primeiroCampo.focus(), 50);
}

function fecharModal(id) {
  $(id).classList.remove('aberto');
}

function iniciarModais() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => { if (e.target === modal) fecharModal(modal.id); });
  });
  document.querySelectorAll('[data-fechar-modal]').forEach(botao => {
    botao.addEventListener('click', () => fecharModal(botao.closest('.modal').id));
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal.aberto').forEach(m => fecharModal(m.id));
  });
}


/* =====================================================================
   3. ESTADO
   ===================================================================== */

var pecasCliente = [];     // peças do cliente ativo (de /pecas/<id>)
var looksCliente = [];     // looks do cliente ativo (de /looks/<id>)
var categoriasPeca = [];   // categorias de peça (de /categorias)
var categoriasLook = [];   // categorias de look (de /categorias_look)
var dadosCarregados = false;

// Peças do look em montagem, separadas por parte do corpo (só os ids)
var lookAtual = { 1: [], 2: [], 3: [], 4: [], 5: [] };

// Filtros de cada área (lidos pelas funções de desenho)
const filtroClientes = { texto: '', tipo: 'todos', ordem: 'nome' };
const filtroPecas = { texto: '', parte: 'todas', estacao: '', ocasiao: '', categoria: '', favoritas: false, ordem: 'recentes' };
const filtroCloset = { texto: '', parte: 'todas', estacao: '' };
const filtroLooks = { texto: '', categoria: '', favoritos: false, ordem: 'recentes' };

// ids esperando a confirmação de exclusão
var idClienteExcluir = null;
var idPecaExcluir = null;
var idLookExcluir = null;

function clienteAtivo() {
  return document.querySelector('.itemCliente[aria-current="true"]');
}
function idClienteAtivo() {
  const ativo = clienteAtivo();
  return ativo ? ativo.dataset.id : null;
}
function buscarPeca(idPeca) {
  return pecasCliente.find(p => p.id_peca === Number(idPeca));
}
function buscarLook(idLook) {
  return looksCliente.find(l => l.id_look === Number(idLook));
}
// parte do corpo da peça (categoria sem parte vira "acessório", igual ao boneco.js)
function parteDaPeca(peca) {
  return PARTES_CORPO[peca.parte_corpo] ? Number(peca.parte_corpo) : 5;
}


/* =====================================================================
   4. FILTRO DE CLIENTES  [NOVO]
   ---------------------------------------------------------------------
   Os clientes aparecem como "stories" (círculos no topo). Eles já vêm
   prontos no HTML (gerados pelo Flask); aqui só escondemos/mostramos e
   reordenamos os círculos, sem ir ao servidor.
   ===================================================================== */

function aplicarFiltroClientes() {
  const lista = $('scrollClientes');
  const linhas = [...lista.querySelectorAll('.linhaCliente')];
  const busca = normalizar(filtroClientes.texto);

  let visiveis = 0;
  linhas.forEach(li => {
    const pecas = Number(li.dataset.pecas);
    const looks = Number(li.dataset.looks);
    const favoritos = Number(li.dataset.favoritos);

    let passa = !busca || normalizar(li.dataset.busca).includes(busca);
    if (filtroClientes.tipo === 'com_looks') passa = passa && looks > 0;
    if (filtroClientes.tipo === 'sem_looks') passa = passa && looks === 0;
    if (filtroClientes.tipo === 'sem_pecas') passa = passa && pecas === 0;
    if (filtroClientes.tipo === 'favoritos') passa = passa && favoritos > 0;

    li.hidden = !passa;
    if (passa) visiveis++;
  });

  // ordena (appendChild move o elemento para o fim, na ordem certa)
  const comparadores = {
    nome: (a, b) => a.dataset.nome.localeCompare(b.dataset.nome, 'pt-BR'),
    pecas: (a, b) => b.dataset.pecas - a.dataset.pecas,
    looks: (a, b) => b.dataset.looks - a.dataset.looks,
    recentes: (a, b) => (b.dataset.cadastro || '').localeCompare(a.dataset.cadastro || '')
  };
  linhas.sort(comparadores[filtroClientes.ordem]).forEach(li => lista.appendChild(li));

  $('totalClientes').textContent = linhas.length;
  $('semClientes').hidden = visiveis > 0;
  if (linhas.length > 0) $('textoSemClientes').textContent = 'Nenhum cliente encontrado com esse filtro.';
}

function iniciarFiltroClientes() {
  $('buscaClientes').addEventListener('input', e => { filtroClientes.texto = e.target.value; aplicarFiltroClientes(); });

  document.querySelectorAll('.chipsClientes .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      filtroClientes.tipo = chip.dataset.filtro;
      document.querySelectorAll('.chipsClientes .chip').forEach(c => c.setAttribute('aria-pressed', c === chip));
      aplicarFiltroClientes();
    });
  });

  $('ordenarClientes').addEventListener('change', e => { filtroClientes.ordem = e.target.value; aplicarFiltroClientes(); });
  aplicarFiltroClientes();
}

// Depois de carregar os dados, atualiza os números do cliente no "story"
// (assim o filtro "com looks" já considera um look que acabou de ser salvo)
function atualizarResumoNoStory(idCliente) {
  const botao = document.querySelector(`.itemCliente[data-id="${idCliente}"]`);
  if (!botao) return;
  const li = botao.closest('.linhaCliente');
  li.dataset.pecas = pecasCliente.length;
  li.dataset.looks = looksCliente.length;
  li.dataset.favoritos = looksCliente.filter(l => l.is_favorito).length;
  // anel colorido só em quem tem looks (como o story "não visto" do Instagram)
  botao.querySelector('.anelStory').classList.toggle('semAnel', looksCliente.length === 0);
}


/* =====================================================================
   5. CLIENTE ATIVO
   ===================================================================== */

function ativarCliente(botao) {
  document.querySelectorAll('.itemCliente').forEach(b => b.removeAttribute('aria-current'));
  botao.setAttribute('aria-current', 'true');
  salvarPreferencia('cliente', botao.dataset.id);

  $('nomeClienteAtivo').textContent = botao.dataset.nome;
  $('emailClienteAtivo').textContent = botao.dataset.email;
  $('fotoClienteAtivo').src = botao.dataset.foto;
  $('fotoClienteAtivo').alt = `Foto de ${botao.dataset.nome}`;

  // trocou de cliente: o look em montagem era do cliente anterior, então zera
  lookAtual = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  $('tituloLook').value = '';
  filtroPecas.parte = 'todas';

  carregarDadosCliente(botao.dataset.id);
}

// Busca peças e looks do cliente AO MESMO TEMPO (Promise.all) e redesenha
function carregarDadosCliente(idCliente) {
  dadosCarregados = false;
  $('painelPecas').innerHTML = '<div class="estadoVazio">Carregando...</div>';

  const buscarJson = url => fetch(url).then(res => {
    if (!res.ok) throw new Error(`Erro ${res.status} em ${url}`);
    return res.json();
  });

  return Promise.all([buscarJson(`/pecas/${idCliente}`), buscarJson(`/looks/${idCliente}`)])
    .then(([pecas, looks]) => {
      // se a consultora trocou de cliente enquanto carregava, ignora a resposta antiga
      if (String(idCliente) !== String(idClienteAtivo())) return;
      pecasCliente = pecas || [];
      looksCliente = looks || [];
      dadosCarregados = true;

      // tira do look em montagem peças que não existem mais (ex.: excluída)
      Object.keys(lookAtual).forEach(p => { lookAtual[p] = lookAtual[p].filter(buscarPeca); });

      atualizarCabecalho();
      renderizarDestaques();
      atualizarResumoNoStory(idCliente);
      renderizarAbaAtiva();
    })
    .catch(erro => {
      console.error(erro);
      $('painelPecas').innerHTML = '<div class="estadoVazio">Não foi possível carregar os dados. Tente novamente.</div>';
    });
}

function iniciarClientes() {
  const botoes = document.querySelectorAll('.itemCliente');
  botoes.forEach(botao => botao.addEventListener('click', () => ativarCliente(botao)));
  if (botoes.length === 0) return;

  // reabre o último cliente usado (ex.: depois de cadastrar uma peça a página recarrega)
  // Sem cliente salvo, abre o primeiro que JÁ TEM peças: antes abria sempre o
  // primeiro da lista (A–Z), e se ele estivesse vazio parecia que nada carregava.
  const salvo = lerPreferencia('cliente');
  const comPecas = [...botoes].find(b => Number(b.closest('.linhaCliente').dataset.pecas) > 0);
  const inicial = [...botoes].find(b => b.dataset.id === salvo) || comPecas || botoes[0];
  ativarCliente(inicial);
}


/* =====================================================================
   6. ABAS
   ===================================================================== */

function abaAtiva() {
  const aba = document.querySelector('.abaPerfil[aria-selected="true"]');
  return aba ? aba.dataset.aba : 'pecas';
}

function trocarAba(nome) {
  document.querySelectorAll('.abaPerfil').forEach(aba => aba.setAttribute('aria-selected', aba.dataset.aba === nome));
  document.querySelectorAll('.painelAba').forEach(painel => { painel.hidden = painel.id !== 'painel-' + nome; });
  salvarPreferencia('aba', nome);
  renderizarAbaAtiva();
}

// Desenha só a aba aberta (os dados já estão em memória)
function renderizarAbaAtiva() {
  if (!dadosCarregados) return;
  const aba = abaAtiva();
  if (aba === 'pecas') renderizarPecas();
  if (aba === 'looks') renderizarGaleriaLooks();
  if (aba === 'montar') renderizarEstudioLook();
  if (aba === 'favoritos') renderizarFavoritos();
  if (aba === 'resumo') renderizarResumo();
}

function iniciarAbas() {
  document.querySelectorAll('.abaPerfil').forEach(aba => aba.addEventListener('click', () => trocarAba(aba.dataset.aba)));
  // botões que levam a uma aba (ex.: "Montar look" no cabeçalho do perfil)
  document.querySelectorAll('[data-ir-aba]').forEach(botao => botao.addEventListener('click', () => trocarAba(botao.dataset.irAba)));
  const salva = lerPreferencia('aba');
  if (salva && $('painel-' + salva)) trocarAba(salva);
}


/* =====================================================================
   7. CABEÇALHO DO PERFIL E DESTAQUES  [NOVO]
   ===================================================================== */

function atualizarCabecalho() {
  const favoritos = looksCliente.filter(l => l.is_favorito).length;
  $('numPecas').textContent = pecasCliente.length;
  $('numLooks').textContent = looksCliente.length;
  $('numFavoritos').textContent = favoritos;

  // "bio" do perfil: uma frase curta calculada a partir do guarda-roupa
  const porParte = contar(pecasCliente.map(parteDaPeca));
  const maior = Object.entries(porParte).sort((a, b) => b[1] - a[1])[0];
  $('bioClienteAtivo').textContent = maior
    ? `A maior parte do guarda-roupa é de ${PARTES_CORPO[maior[0]].toLowerCase()}.`
    : 'Guarda-roupa ainda vazio.';
}

// Círculos de "destaques": um por parte do corpo, com a foto da peça mais
// recente daquela parte. Clicar abre a aba PEÇAS já filtrada por essa parte.
function renderizarDestaques() {
  const lista = $('destaques');
  lista.innerHTML = Object.entries(PARTES_CORPO).map(([parte, nome]) => {
    const daParte = pecasCliente.filter(p => parteDaPeca(p) === Number(parte));
    const capa = daParte[0];
    return `
      <li>
        <button class="destaque ${String(filtroPecas.parte) === parte ? 'ativo' : ''}" type="button" data-parte="${parte}"
                aria-label="${nome}: ${plural(daParte.length, 'peça', 'peças')}">
          <span class="circuloDestaque">
            ${capa ? `<img src="${capa.imagem || IMAGEM_PADRAO}" alt="" loading="lazy">` : `<span class="iconeDestaque">${ICONES_PARTES[parte]}</span>`}
          </span>
          <span class="nomeDestaque">${nome}</span>
        </button>
      </li>`;
  }).join('');

  lista.querySelectorAll('.destaque').forEach(botao => {
    botao.addEventListener('click', () => {
      // clicar de novo no destaque ativo tira o filtro
      filtroPecas.parte = String(filtroPecas.parte) === botao.dataset.parte ? 'todas' : botao.dataset.parte;
      renderizarDestaques();
      trocarAba('pecas');
    });
  });
}


/* =====================================================================
   8. PEÇAS — grade de fotos + FILTRO DE PEÇAS  [NOVO]
   ---------------------------------------------------------------------
   Antes: carrosséis por categoria, sem busca.
   Agora: grade de fotos quadradas (3 por linha, como o Instagram) com
   filtros combináveis: busca (nome, categoria, observações) + parte do
   corpo + estação + ocasião + categoria + só favoritas + ordenação.
   ===================================================================== */

// Aplica um conjunto de filtros a uma lista de peças (usado nas peças e no closet)
function filtrarPecas(pecas, filtro) {
  const busca = normalizar(filtro.texto);
  return pecas.filter(peca => {
    if (filtro.parte && filtro.parte !== 'todas' && parteDaPeca(peca) !== Number(filtro.parte)) return false;
    if (filtro.estacao && peca.estacao !== filtro.estacao) return false;
    if (filtro.ocasiao && peca.ocasiao !== filtro.ocasiao) return false;
    if (filtro.categoria && String(peca.id_categoria) !== String(filtro.categoria)) return false;
    if (filtro.favoritas && !peca.is_favorito) return false;
    if (busca) {
      const texto = normalizar([peca.titulo, peca.categoria_nome, peca.observacoes, peca.estacao, peca.ocasiao].join(' '));
      if (!texto.includes(busca)) return false;
    }
    return true;
  });
}

// Preenche um select de "parte do corpo" com a quantidade de peças em cada parte
function preencherSelectParte(idSelect, filtro) {
  const select = $(idSelect);
  const porParte = contar(pecasCliente.map(parteDaPeca));
  select.innerHTML = `<option value="todas">Todas as partes (${pecasCliente.length})</option>` +
    Object.entries(PARTES_CORPO).map(([parte, nome]) => `<option value="${parte}">${nome} (${porParte[parte] || 0})</option>`).join('');
  select.value = filtro.parte;
}

// Select de categorias: só as categorias usadas nas peças deste cliente
function preencherFiltroCategoriaPecas() {
  const select = $('filtroCategoriaPecas');
  const usadas = new Map();
  pecasCliente.forEach(p => { if (p.id_categoria) usadas.set(String(p.id_categoria), p.categoria_nome); });
  const opcoes = [...usadas.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  select.innerHTML = '<option value="">Todas as categorias</option>' +
    opcoes.map(([id, nome]) => `<option value="${id}">${escaparHtml(nome)}</option>`).join('');
  if (!usadas.has(String(filtroPecas.categoria))) filtroPecas.categoria = '';
  select.value = filtroPecas.categoria;
}

function filtrosPecasAtivos() {
  return !!(filtroPecas.texto || filtroPecas.parte !== 'todas' || filtroPecas.estacao ||
    filtroPecas.ocasiao || filtroPecas.categoria || filtroPecas.favoritas);
}

// HTML de uma foto da grade de peças (o "post"). Ao passar o mouse aparece
// uma camada escura com o nome e a categoria (como as curtidas no Instagram).
function tilePeca(peca) {
  return `
    <button class="tileFoto" type="button" data-tipo="peca" data-id="${peca.id_peca}" aria-label="Abrir ${escaparHtml(peca.titulo)}">
      <img src="${peca.imagem || IMAGEM_PADRAO}" alt="" loading="lazy">
      ${peca.is_favorito ? `<span class="marcaTile" aria-hidden="true">${ICONE_ESTRELA}</span>` : ''}
      <span class="camadaTile">
        <strong>${escaparHtml(peca.titulo)}</strong>
        <span>${escaparHtml(peca.categoria_nome)}${peca.estacao ? ' · ' + escaparHtml(peca.estacao) : ''}</span>
      </span>
    </button>`;
}

// Liga o clique das fotos de uma grade ao detalhe (post)
function ligarTiles(container) {
  container.querySelectorAll('.tileFoto').forEach(tile => {
    tile.addEventListener('click', () => {
      if (tile.dataset.tipo === 'peca') abrirPostPeca(tile.dataset.id);
      else abrirPostLook(tile.dataset.id);
    });
  });
}

function renderizarPecas() {
  const painel = $('painelPecas');
  preencherSelectParte('filtroPartePecas', filtroPecas);
  preencherFiltroCategoriaPecas();

  const ordenadores = {
    recentes: (a, b) => (b.data || '').localeCompare(a.data || ''),
    nome: (a, b) => (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR'),
    parte: (a, b) => parteDaPeca(a) - parteDaPeca(b) || (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR')
  };
  const pecas = filtrarPecas(pecasCliente, filtroPecas).sort(ordenadores[filtroPecas.ordem]);

  $('contagemPecas').textContent = filtrosPecasAtivos()
    ? `${plural(pecas.length, 'peça encontrada', 'peças encontradas')} de ${pecasCliente.length}`
    : plural(pecasCliente.length, 'peça', 'peças');
  $('limparFiltrosPecas').hidden = !filtrosPecasAtivos();

  if (pecasCliente.length === 0) {
    painel.innerHTML = `
      <div class="estadoVazio">
        ${ICONE_CABIDE}
        <strong>Ainda não há peças</strong>
        <span>Quando você adicionar peças, elas aparecem aqui.</span>
        <button class="botao botaoTexto" type="button" data-acao="adicionar-peca">Adicionar a primeira peça</button>
      </div>`;
    painel.querySelector('[data-acao="adicionar-peca"]').addEventListener('click', () => $('btnAdicionarPeca').click());
    return;
  }
  if (pecas.length === 0) {
    painel.innerHTML = '<div class="estadoVazio"><strong>Nenhuma peça encontrada</strong><span>Tente outro filtro ou limpe a busca.</span></div>';
    return;
  }

  painel.innerHTML = pecas.map(tilePeca).join('');
  ligarTiles(painel);
}

// [NOVO] liga/desliga a estrela da peça (rota /favoritar_peca no app.py)
async function favoritarPeca(idPeca) {
  const peca = buscarPeca(idPeca);
  if (!peca) return;
  try {
    const res = await fetch(`/favoritar_peca/${idPeca}`, { method: 'POST' });
    if (!res.ok) throw new Error();
    const dados = await res.json();
    peca.is_favorito = dados.is_favorito;
    mostrarToast(dados.is_favorito ? 'Peça adicionada às favoritas' : 'Peça removida das favoritas');
    renderizarAbaAtiva();
  } catch {
    mostrarToast('Não foi possível favoritar a peça.');
  }
}

function iniciarFiltroPecas() {
  $('buscaPecas').addEventListener('input', e => { filtroPecas.texto = e.target.value; renderizarPecas(); });
  $('filtroPartePecas').addEventListener('change', e => { filtroPecas.parte = e.target.value; renderizarDestaques(); renderizarPecas(); });
  $('filtroEstacaoPecas').addEventListener('change', e => { filtroPecas.estacao = e.target.value; renderizarPecas(); });
  $('filtroOcasiaoPecas').addEventListener('change', e => { filtroPecas.ocasiao = e.target.value; renderizarPecas(); });
  $('filtroCategoriaPecas').addEventListener('change', e => { filtroPecas.categoria = e.target.value; renderizarPecas(); });
  $('ordenarPecas').addEventListener('change', e => { filtroPecas.ordem = e.target.value; renderizarPecas(); });
  $('filtroFavoritasPecas').addEventListener('click', e => {
    filtroPecas.favoritas = !filtroPecas.favoritas;
    e.currentTarget.setAttribute('aria-pressed', filtroPecas.favoritas);
    renderizarPecas();
  });

  // "Limpar filtros": volta tudo ao padrão (mantém só a ordenação)
  $('limparFiltrosPecas').addEventListener('click', () => {
    Object.assign(filtroPecas, { texto: '', parte: 'todas', estacao: '', ocasiao: '', categoria: '', favoritas: false });
    $('buscaPecas').value = '';
    $('filtroEstacaoPecas').value = '';
    $('filtroOcasiaoPecas').value = '';
    $('filtroFavoritasPecas').setAttribute('aria-pressed', 'false');
    renderizarDestaques();
    renderizarPecas();
  });
}


/* =====================================================================
   9. DETALHE (POST)  [NOVO]
   ---------------------------------------------------------------------
   Clicar numa foto abre a "publicação": imagem à esquerda e informações
   à direita, com os botões de ação embaixo (estrela, provador/usar como
   base, excluir) — como um post aberto no Instagram.
   ===================================================================== */

// cabeçalho do post: foto e nome da cliente (como o autor do post)
function cabecalhoPost() {
  const ativo = clienteAtivo();
  return `
    <div class="autorPost">
      <span class="fotoAutor"><img src="${ativo.dataset.foto}" alt=""></span>
      <strong>${escaparHtml(ativo.dataset.nome)}</strong>
    </div>`;
}

function abrirPostPeca(idPeca) {
  const peca = buscarPeca(idPeca);
  if (!peca) return;
  // em quantos looks a peça já aparece
  const emLooks = looksCliente.filter(l => l.pecas.some(p => p.id_peca === peca.id_peca)).length;

  $('conteudoPost').innerHTML = `
    <div class="midiaPost"><img src="${peca.imagem || IMAGEM_PADRAO}" alt="${escaparHtml(peca.titulo)}"></div>
    <div class="ladoPost">
      ${cabecalhoPost()}
      <div class="textoPost">
        <h2>${escaparHtml(peca.titulo)}</h2>
        <dl class="dadosPost">
          <dt>Categoria</dt><dd>${escaparHtml(peca.categoria_nome)}</dd>
          <dt>Parte do corpo</dt><dd>${PARTES_CORPO[parteDaPeca(peca)]}</dd>
          <dt>Estação</dt><dd>${escaparHtml(peca.estacao || '—')}</dd>
          <dt>Ocasião</dt><dd>${escaparHtml(peca.ocasiao || '—')}</dd>
          <dt>Usada em</dt><dd>${plural(emLooks, 'look', 'looks')}</dd>
        </dl>
        ${peca.observacoes ? `<p class="obsPost">${escaparHtml(peca.observacoes)}</p>` : ''}
      </div>
      <div class="acoesPost">
        <button class="botaoIcone ${peca.is_favorito ? 'favoritado' : ''}" type="button" id="postFavoritar"
                aria-pressed="${!!peca.is_favorito}" aria-label="Favoritar" title="Favoritar">${ICONE_ESTRELA}</button>
        <button class="botaoIcone" type="button" id="postVestir" aria-label="Vestir no manequim" title="Vestir no manequim">${ICONE_CABIDE}</button>
        <button class="botaoIcone botaoExcluirPost" type="button" id="postExcluir" aria-label="Excluir peça" title="Excluir peça">${ICONE_LIXEIRA}</button>
      </div>
      <span class="dataPost">${peca.data ? 'Adicionada em ' + formatarData(peca.data) : ''}</span>
    </div>`;

  $('postFavoritar').addEventListener('click', async () => { await favoritarPeca(peca.id_peca); abrirPostPeca(peca.id_peca); });
  $('postVestir').addEventListener('click', () => {
    fecharModal('modalPost');
    trocarAba('montar');
    if (!pecaEstaNoLook(peca.id_peca)) vestirPeca(peca.id_peca);
  });
  $('postExcluir').addEventListener('click', () => {
    idPecaExcluir = peca.id_peca;
    $('textoConfirmacaoPeca').textContent = `"${peca.titulo}" sai do guarda-roupa e dos looks em que aparece.`;
    fecharModal('modalPost');
    abrirModal('modalConfirmacaoPeca');
  });
  abrirModal('modalPost');
}

function abrirPostLook(idLook) {
  const look = buscarLook(idLook);
  if (!look) return;

  $('conteudoPost').innerHTML = `
    <div class="midiaPost midiaLook">${montarBoneco(look.pecas)}</div>
    <div class="ladoPost">
      ${cabecalhoPost()}
      <div class="textoPost">
        <h2>${escaparHtml(look.titulo)}</h2>
        <div class="chipsPost">${look.categorias.map(c => `<span class="etiqueta">${escaparHtml(c.nome)}</span>`).join('')}</div>
        <ul class="pecasPost">
          ${look.pecas.map(p => `
            <li>
              <img src="${p.imagem || IMAGEM_PADRAO}" alt="">
              <span><strong>${escaparHtml(p.titulo)}</strong><small>${escaparHtml(p.categoria_nome)}</small></span>
            </li>`).join('')}
        </ul>
      </div>
      <div class="acoesPost">
        <button class="botaoIcone ${look.is_favorito ? 'favoritado' : ''}" type="button" id="postFavoritar"
                aria-pressed="${!!look.is_favorito}" aria-label="Favoritar" title="Favoritar">${ICONE_ESTRELA}</button>
        <button class="botaoIcone" type="button" id="postBase" aria-label="Usar como base" title="Usar como base para um novo look">${ICONE_COPIAR}</button>
        <button class="botaoIcone botaoExcluirPost" type="button" id="postExcluir" aria-label="Excluir look" title="Excluir look">${ICONE_LIXEIRA}</button>
      </div>
      <span class="dataPost">${plural(look.pecas.length, 'peça', 'peças')}${look.data ? ' · ' + formatarData(look.data) : ''}</span>
    </div>`;

  $('postFavoritar').addEventListener('click', async () => { await favoritarLook(look.id_look); abrirPostLook(look.id_look); });
  $('postBase').addEventListener('click', () => { fecharModal('modalPost'); usarLookComoBase(look.id_look); });
  $('postExcluir').addEventListener('click', () => {
    idLookExcluir = look.id_look;
    fecharModal('modalPost');
    abrirModal('modalConfirmacaoLook');
  });
  abrirModal('modalPost');
}


/* =====================================================================
   10. CATEGORIAS DE PEÇA
   ---------------------------------------------------------------------
   Cada categoria (Calça, Sapato, Boné...) tem uma parte_corpo (1 a 5).
   É por ela que o manequim sabe onde encaixar cada peça.
   ===================================================================== */

function carregarCategorias() {
  fetch('/categorias')
    .then(res => res.json())
    .then(categorias => {
      categoriasPeca = categorias || [];
      preencherSelectCategorias();
      renderizarListaCategorias();
    })
    .catch(() => console.error('Erro ao carregar categorias'));
}

// <select> do formulário "Nova peça", agrupado por parte do corpo (<optgroup>)
function preencherSelectCategorias() {
  const select = $('categoriaPeca');
  const valorAtual = select.value;
  select.innerHTML = '<option value="" disabled selected>Categoria</option>';

  [...Object.keys(PARTES_CORPO).map(Number), null].forEach(parte => {
    const daParte = categoriasPeca.filter(cat => (cat.parte_corpo || null) === parte);
    if (daParte.length === 0) return;
    const grupo = document.createElement('optgroup');
    grupo.label = parte ? PARTES_CORPO[parte] : 'Sem parte do corpo';
    daParte.forEach(cat => grupo.appendChild(new Option(cat.nome, cat.id_categoria)));
    select.appendChild(grupo);
  });
  if (valorAtual) select.value = valorAtual;
}

function renderizarListaCategorias() {
  $('listaCategorias').innerHTML = Object.entries(PARTES_CORPO).map(([parte, nomeParte]) => {
    const daParte = categoriasPeca.filter(cat => cat.parte_corpo === Number(parte));
    return `
      <div class="grupoCategoriaParte">
        <span class="rotuloSecao">${nomeParte}</span>
        <div class="chipsCategoria">
          ${daParte.length
            ? daParte.map(cat => `<span class="etiqueta">${escaparHtml(cat.nome)}</span>`).join('')
            : '<span class="etiqueta vazio">Nenhuma</span>'}
        </div>
      </div>`;
  }).join('');
}

function iniciarCategorias() {
  const form = $('formCategoria');
  const msg = $('msgCategoria');

  // envia a nova categoria para o Flask (/adicionar_categoria) sem recarregar a página
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const nome = form.nome.value.trim();
    const parte = form.querySelector('input[name="parte_corpo"]:checked');
    if (!nome || !parte) { mostrarMensagem(msg, 'Preencha o nome e escolha a parte do corpo.', 'erro'); return; }
    try {
      const res = await fetch('/adicionar_categoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, parte_corpo: Number(parte.value) })
      });
      const dados = await res.json();
      if (!res.ok) { mostrarMensagem(msg, dados.erro || 'Erro ao cadastrar categoria.', 'erro'); return; }
      categoriasPeca.push(dados);
      categoriasPeca.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      preencherSelectCategorias();
      renderizarListaCategorias();
      form.reset();
      mostrarMensagem(msg, `Categoria "${dados.nome}" cadastrada!`, 'sucesso');
    } catch {
      mostrarMensagem(msg, 'Erro ao cadastrar categoria.', 'erro');
    }
  });
}


/* =====================================================================
   11. MONTAR LOOK — CLOSET + MANEQUIM COM ARRASTAR E SOLTAR  [NOVO]
   ---------------------------------------------------------------------
   Como funciona o arrastar e soltar (Drag and Drop nativo do HTML5):
     1. "dragstart": ao começar a arrastar a foto de uma peça, guardamos o
        id dela e colocamos a classe .arrastandoPeca no <body>. O CSS então
        mostra as áreas do manequim e destaca a área certa da peça.
     2. "dragover": enquanto passa por cima do manequim, chamamos
        preventDefault() (sem isso o navegador não deixa soltar).
     3. "drop": ao soltar, a peça entra no look. Ela SEMPRE vai para a parte
        do corpo da categoria dela — se soltar um sapato na cabeça, ele vai
        para os pés e um aviso explica isso.
     4. "dragend": limpa os destaques.
   Para tirar: arrastar a peça do manequim de volta para o closet, ou X.
   No celular/tablet, tocar na peça do closet coloca/tira do manequim.
   ===================================================================== */

var pecaArrastada = null;   // { id, origem: 'closet' | 'manequim' }

function pecasDoLookAtual() {
  return Object.values(lookAtual).flat().map(buscarPeca).filter(Boolean);
}

function pecaEstaNoLook(idPeca) {
  return Object.values(lookAtual).some(ids => ids.includes(Number(idPeca)));
}

// Coloca a peça no look. parteSolta = área onde a consultora soltou (pode ser diferente)
function vestirPeca(idPeca, parteSolta = null) {
  const peca = buscarPeca(idPeca);
  if (!peca) return;
  const parte = parteDaPeca(peca);

  if (pecaEstaNoLook(peca.id_peca)) { mostrarToast(`"${peca.titulo}" já está no look`); return; }
  lookAtual[parte].push(peca.id_peca);

  if (parteSolta && Number(parteSolta) !== parte) {
    mostrarToast(`"${peca.titulo}" é de ${PARTES_CORPO[parte].toLowerCase()}: colocamos no lugar certo`);
  }
  renderizarEstudioLook();
}

function despirPeca(idPeca) {
  Object.keys(lookAtual).forEach(p => { lookAtual[p] = lookAtual[p].filter(id => id !== Number(idPeca)); });
  renderizarEstudioLook();
}

function renderizarEstudioLook() {
  renderizarCloset();
  renderizarManequim();
  renderizarResumoLook();
}

/* ---------- closet (coluna da esquerda) ---------- */

function renderizarCloset() {
  preencherSelectParte('filtroParteCloset', filtroCloset);
  const grade = $('gradeCloset');
  const pecas = filtrarPecas(pecasCliente, filtroCloset);
  $('contagemCloset').textContent = plural(pecas.length, 'peça', 'peças');

  if (pecasCliente.length === 0) {
    grade.innerHTML = '<p class="dicaVazia">Nenhuma peça cadastrada.</p>';
    return;
  }
  if (pecas.length === 0) {
    grade.innerHTML = '<p class="dicaVazia">Nenhuma peça com esse filtro.</p>';
    return;
  }

  // draggable="true" é o que permite arrastar o card
  grade.innerHTML = pecas.map(peca => {
    const noLook = pecaEstaNoLook(peca.id_peca);
    return `
      <button class="pecaCloset ${noLook ? 'noLook' : ''}" type="button" draggable="true"
              data-id="${peca.id_peca}" data-origem="closet" aria-pressed="${noLook}"
              title="${escaparHtml(peca.titulo)} — ${escaparHtml(peca.categoria_nome)}">
        <img src="${peca.imagem || IMAGEM_PADRAO}" alt="" draggable="false" loading="lazy">
        <span class="nomePecaCloset">${escaparHtml(peca.titulo)}</span>
        <span class="marcaNoLook" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg></span>
      </button>`;
  }).join('');
}

/* ---------- manequim (coluna do meio) ---------- */

function renderizarManequim() {
  const area = $('areaManequim');
  area.innerHTML = montarManequim(pecasDoLookAtual());
  area.querySelectorAll('.removerPecaVestida').forEach(botao => {
    botao.addEventListener('click', e => { e.stopPropagation(); despirPeca(botao.dataset.id); });
  });
  $('btnLimparLook').hidden = pecasDoLookAtual().length === 0;
}

/* ---------- resumo + salvar (coluna da direita) ---------- */

function renderizarResumoLook() {
  const lista = $('listaResumoLook');
  const pecas = pecasDoLookAtual();
  $('contagemLookAtual').textContent = plural(pecas.length, 'peça', 'peças');

  if (pecas.length === 0) {
    lista.innerHTML = '<p class="dicaVazia">Arraste peças do closet para o manequim.</p>';
    return;
  }

  lista.innerHTML = Object.entries(PARTES_CORPO)
    .filter(([parte]) => lookAtual[parte].length)
    .map(([parte, nome]) => `
      <div class="grupoResumo">
        <span class="rotuloSecao">${nome}</span>
        ${lookAtual[parte].map(buscarPeca).filter(Boolean).map(peca => `
          <div class="linhaResumo">
            <img src="${peca.imagem || IMAGEM_PADRAO}" alt="">
            <span class="textoResumo"><strong>${escaparHtml(peca.titulo)}</strong><small>${escaparHtml(peca.categoria_nome)}</small></span>
            <button class="botao botaoTexto botaoRemover" type="button" data-id="${peca.id_peca}" aria-label="Tirar ${escaparHtml(peca.titulo)} do look">Remover</button>
          </div>`).join('')}
      </div>`).join('');

  lista.querySelectorAll('.botaoRemover').forEach(botao => botao.addEventListener('click', () => despirPeca(botao.dataset.id)));
}

/* ---------- eventos de arrastar e soltar ---------- */

function limparDestaquesArraste() {
  document.body.classList.remove('arrastandoPeca');
  document.querySelectorAll('.zonaAlvo, .sobre, .soltarAqui').forEach(el => el.classList.remove('zonaAlvo', 'sobre', 'soltarAqui'));
  pecaArrastada = null;
}

function iniciarArrastarSoltar() {
  const area = $('areaManequim');
  const closet = $('closet');

  // delegação de eventos: funciona para os cards criados depois pelo innerHTML
  document.addEventListener('dragstart', e => {
    const alvo = e.target.closest && e.target.closest('[draggable="true"][data-id]');
    if (!alvo) return;
    pecaArrastada = { id: Number(alvo.dataset.id), origem: alvo.dataset.origem };
    e.dataTransfer.setData('text/plain', String(alvo.dataset.id));
    e.dataTransfer.effectAllowed = 'copyMove';

    const peca = buscarPeca(alvo.dataset.id);
    // setTimeout: deixa o navegador "fotografar" o card antes de mudarmos o visual
    setTimeout(() => {
      document.body.classList.add('arrastandoPeca');
      if (peca) document.querySelectorAll(`.zonaManequim[data-parte="${parteDaPeca(peca)}"]`).forEach(z => z.classList.add('zonaAlvo'));
      if (pecaArrastada && pecaArrastada.origem === 'manequim') closet.classList.add('soltarAqui');
    }, 0);
  });

  document.addEventListener('dragend', limparDestaquesArraste);

  // ---- soltar NO MANEQUIM (inclui a bandeja de acessórios) ----
  area.addEventListener('dragover', e => {
    if (!pecaArrastada) return;
    e.preventDefault();   // obrigatório para permitir o "drop"
    e.dataTransfer.dropEffect = 'copy';
    const zona = e.target.closest('.zonaManequim');
    area.querySelectorAll('.sobre').forEach(z => { if (z !== zona) z.classList.remove('sobre'); });
    if (zona) zona.classList.add('sobre');
  });

  area.addEventListener('dragleave', e => {
    if (!area.contains(e.relatedTarget)) area.querySelectorAll('.sobre').forEach(z => z.classList.remove('sobre'));
  });

  area.addEventListener('drop', e => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData('text/plain')) || (pecaArrastada && pecaArrastada.id);
    const origem = pecaArrastada && pecaArrastada.origem;
    const zona = e.target.closest('.zonaManequim');
    limparDestaquesArraste();
    if (!id || origem === 'manequim') return;   // mover dentro do manequim não muda nada
    vestirPeca(id, zona ? zona.dataset.parte : null);
  });

  // ---- soltar NO CLOSET (tira a peça do manequim) ----
  closet.addEventListener('dragover', e => {
    if (pecaArrastada && pecaArrastada.origem === 'manequim') { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
  });
  closet.addEventListener('drop', e => {
    if (!pecaArrastada || pecaArrastada.origem !== 'manequim') return;
    e.preventDefault();
    const id = pecaArrastada.id;
    limparDestaquesArraste();
    despirPeca(id);
  });

  // ---- toque/clique no card do closet: coloca ou tira do look ----
  $('gradeCloset').addEventListener('click', e => {
    const card = e.target.closest('.pecaCloset');
    if (!card) return;
    if (pecaEstaNoLook(card.dataset.id)) despirPeca(card.dataset.id);
    else vestirPeca(card.dataset.id);
  });
}

function iniciarFiltroCloset() {
  $('buscaCloset').addEventListener('input', e => { filtroCloset.texto = e.target.value; renderizarCloset(); });
  $('filtroParteCloset').addEventListener('change', e => { filtroCloset.parte = e.target.value; renderizarCloset(); });
  $('filtroEstacaoCloset').addEventListener('change', e => { filtroCloset.estacao = e.target.value; renderizarCloset(); });
  $('btnLimparLook').addEventListener('click', () => { lookAtual = { 1: [], 2: [], 3: [], 4: [], 5: [] }; renderizarEstudioLook(); });
}

/* ---------- salvar look (nome + categorias) ---------- */

function carregarCategoriasLook() {
  return fetch('/categorias_look')
    .then(res => res.json())
    .then(categorias => {
      categoriasLook = categorias || [];
      renderizarChipsCategoriaLook([]);
      preencherFiltroLooks();
    })
    .catch(() => console.error('Erro ao carregar categorias de look'));
}

// chips clicáveis (checkbox) das categorias de look
function renderizarChipsCategoriaLook(marcadas = []) {
  $('chipsCategoriaLook').innerHTML = categoriasLook.map(cat => `
    <label class="chipCategoriaLook">
      <input type="checkbox" value="${cat.id_categoria_look}" ${marcadas.includes(cat.id_categoria_look) ? 'checked' : ''}>
      <span>${escaparHtml(cat.nome)}</span>
    </label>`).join('');
}

function categoriasLookMarcadas() {
  return [...document.querySelectorAll('#chipsCategoriaLook input:checked')].map(i => Number(i.value));
}

async function salvarLook() {
  const msg = $('msgSalvarLook');
  const botao = $('btnConfirmarSalvarLook');
  const titulo = $('tituloLook').value.trim();
  msg.hidden = true;

  if (pecasDoLookAtual().length === 0) {
    mostrarMensagem(msg, 'Coloque pelo menos uma peça no manequim.', 'erro');
    const manequim = $('manequim');
    if (manequim) { manequim.classList.remove('balancar'); void manequim.offsetWidth; manequim.classList.add('balancar'); }
    return;
  }
  if (!titulo) { mostrarMensagem(msg, 'Dê um nome para o look.', 'erro'); $('tituloLook').focus(); return; }

  botao.disabled = true;   // evita salvar duas vezes com clique duplo
  try {
    const res = await fetch('/salvar_look', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_cliente: Number(idClienteAtivo()),
        titulo,
        pecas: pecasDoLookAtual().map(p => p.id_peca),
        categorias: categoriasLookMarcadas()
      })
    });
    const dados = await res.json();
    if (!res.ok) { mostrarMensagem(msg, dados.erro || 'Erro ao salvar o look.', 'erro'); return; }

    $('tituloLook').value = '';
    renderizarChipsCategoriaLook([]);
    lookAtual = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    mostrarToast('Look salvo! A cliente recebeu uma notificação.');
    await carregarDadosCliente(idClienteAtivo());
    trocarAba('looks');   // mostra o look novo na grade, como depois de publicar
  } catch {
    mostrarMensagem(msg, 'Erro ao salvar o look.', 'erro');
  } finally {
    botao.disabled = false;
  }
}

// cadastra uma categoria de look nova e já deixa marcada
async function adicionarCategoriaLook() {
  const input = $('inputNovaCategoriaLook');
  const msg = $('msgSalvarLook');
  const nome = input.value.trim();
  if (!nome) return;
  try {
    const res = await fetch('/adicionar_categoria_look', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome })
    });
    const dados = await res.json();
    if (!res.ok) { mostrarMensagem(msg, dados.erro || 'Erro ao cadastrar categoria.', 'erro'); return; }
    const marcadas = [...categoriasLookMarcadas(), dados.id_categoria_look];
    categoriasLook.push(dados);
    categoriasLook.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    renderizarChipsCategoriaLook(marcadas);
    preencherFiltroLooks();
    input.value = '';
    msg.hidden = true;
  } catch {
    mostrarMensagem(msg, 'Erro ao cadastrar categoria.', 'erro');
  }
}

function iniciarSalvarLook() {
  $('btnConfirmarSalvarLook').addEventListener('click', salvarLook);
  $('btnNovaCategoriaLook').addEventListener('click', adicionarCategoriaLook);
  $('inputNovaCategoriaLook').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); adicionarCategoriaLook(); } });
  $('tituloLook').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); salvarLook(); } });
}


/* =====================================================================
   12. LOOKS — grade + FILTRO DE LOOKS  [NOVO]
   ---------------------------------------------------------------------
   Filtros: busca (nome do look, de uma peça ou de uma categoria),
   categoria, só favoritos e ordenação. Clicar abre o detalhe do look.
   ===================================================================== */

function preencherFiltroLooks() {
  const filtro = $('filtroLooks');
  filtro.innerHTML = '<option value="">Todas as categorias</option>' +
    categoriasLook.map(cat => `<option value="${cat.id_categoria_look}">${escaparHtml(cat.nome)}</option>`).join('');
  filtro.value = filtroLooks.categoria;
}

function looksFiltrados() {
  const busca = normalizar(filtroLooks.texto);
  const ordenadores = {
    recentes: (a, b) => (b.data || '').localeCompare(a.data || ''),
    antigos: (a, b) => (a.data || '').localeCompare(b.data || ''),
    nome: (a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'),
    pecas: (a, b) => b.pecas.length - a.pecas.length
  };
  return looksCliente.filter(look => {
    if (filtroLooks.favoritos && !look.is_favorito) return false;
    if (filtroLooks.categoria && !look.categorias.some(c => String(c.id_categoria_look) === String(filtroLooks.categoria))) return false;
    if (busca) {
      const textos = [look.titulo, ...look.pecas.map(p => p.titulo), ...look.categorias.map(c => c.nome)];
      if (!textos.some(t => normalizar(t).includes(busca))) return false;
    }
    return true;
  }).sort(ordenadores[filtroLooks.ordem]);
}

// HTML de um look na grade: as peças do look arrumadas num quadrado claro
function tileLook(look) {
  return `
    <button class="tileFoto tileLook" type="button" data-tipo="look" data-id="${look.id_look}" aria-label="Abrir o look ${escaparHtml(look.titulo)}">
      <span class="bonecoTile">${montarBoneco(look.pecas)}</span>
      ${look.is_favorito ? `<span class="marcaTile" aria-hidden="true">${ICONE_ESTRELA}</span>` : ''}
      <span class="camadaTile">
        <strong>${escaparHtml(look.titulo)}</strong>
        <span>${plural(look.pecas.length, 'peça', 'peças')}${look.categorias[0] ? ' · ' + escaparHtml(look.categorias[0].nome) : ''}</span>
      </span>
    </button>`;
}

function renderizarGaleriaLooks() {
  const galeria = $('galeriaLooks');
  const looks = looksFiltrados();
  const filtrando = filtroLooks.texto || filtroLooks.categoria || filtroLooks.favoritos;
  $('contagemLooks').textContent = filtrando
    ? `${plural(looks.length, 'look encontrado', 'looks encontrados')} de ${looksCliente.length}`
    : plural(looksCliente.length, 'look', 'looks');

  if (looksCliente.length === 0) {
    galeria.innerHTML = `
      <div class="estadoVazio">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="4.5" r="2.5"/><path d="M8 21l1-9-3-4h12l-3 4 1 9"/></svg>
        <strong>Ainda não há looks</strong>
        <span>Monte o primeiro look no manequim.</span>
        <button class="botao botaoTexto" type="button" data-acao="montar">Montar look</button>
      </div>`;
    galeria.querySelector('[data-acao="montar"]').addEventListener('click', () => trocarAba('montar'));
    return;
  }
  if (looks.length === 0) {
    galeria.innerHTML = '<div class="estadoVazio"><strong>Nenhum look encontrado</strong><span>Tente outro filtro.</span></div>';
    return;
  }
  galeria.innerHTML = looks.map(tileLook).join('');
  ligarTiles(galeria);
}

async function favoritarLook(idLook) {
  const look = buscarLook(idLook);
  if (!look) return;
  try {
    const res = await fetch(`/favoritar_look/${idLook}`, { method: 'POST' });
    if (!res.ok) throw new Error();
    const dados = await res.json();
    look.is_favorito = dados.is_favorito;
    mostrarToast(dados.is_favorito ? 'Look adicionado aos favoritos' : 'Look removido dos favoritos');
    atualizarCabecalho();
    atualizarResumoNoStory(idClienteAtivo());
    renderizarAbaAtiva();
  } catch {
    mostrarToast('Não foi possível favoritar o look.');
  }
}

// copia as peças de um look para o manequim, para criar uma variação
function usarLookComoBase(idLook) {
  const look = buscarLook(idLook);
  if (!look) return;
  lookAtual = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  look.pecas.forEach(p => {
    const peca = buscarPeca(p.id_peca);
    if (peca) lookAtual[parteDaPeca(peca)].push(peca.id_peca);
  });
  $('tituloLook').value = `${look.titulo} (variação)`;
  renderizarChipsCategoriaLook(look.categorias.map(c => c.id_categoria_look));
  trocarAba('montar');
  mostrarToast('Peças copiadas para o manequim');
}

function iniciarFiltroLooks() {
  $('buscaLooks').addEventListener('input', e => { filtroLooks.texto = e.target.value; renderizarGaleriaLooks(); });
  $('filtroLooks').addEventListener('change', e => { filtroLooks.categoria = e.target.value; renderizarGaleriaLooks(); });
  $('ordenarLooks').addEventListener('change', e => { filtroLooks.ordem = e.target.value; renderizarGaleriaLooks(); });
  $('filtroFavoritosLooks').addEventListener('click', e => {
    filtroLooks.favoritos = !filtroLooks.favoritos;
    e.currentTarget.setAttribute('aria-pressed', filtroLooks.favoritos);
    renderizarGaleriaLooks();
  });
}


/* =====================================================================
   13. FAVORITOS E RESUMO  [NOVO]
   ===================================================================== */

// Aba FAVORITOS: looks e peças com estrela, nas mesmas grades de fotos
function renderizarFavoritos() {
  const looks = looksCliente.filter(l => l.is_favorito);
  const pecas = pecasCliente.filter(p => p.is_favorito);
  $('gradeLooksFavoritos').innerHTML = looks.length
    ? looks.map(tileLook).join('')
    : '<p class="dicaVazia">Nenhum look favorito. Abra um look e toque na estrela.</p>';
  $('gradePecasFavoritas').innerHTML = pecas.length
    ? pecas.map(tilePeca).join('')
    : '<p class="dicaVazia">Nenhuma peça favorita. Abra uma peça e toque na estrela.</p>';
  ligarTiles($('gradeLooksFavoritos'));
  ligarTiles($('gradePecasFavoritas'));
}

// Estações de um look: as categorias do look que são estações (ex.: "Inverno");
// se o look não tiver, usa as estações das peças dele.
function estacoesDoLook(look) {
  const nomes = ESTACOES.map(normalizar);
  const daCategoria = look.categorias.map(c => ESTACOES[nomes.indexOf(normalizar(c.nome))]).filter(Boolean);
  if (daCategoria.length) return [...new Set(daCategoria)];
  const dasPecas = look.pecas.map(p => buscarPeca(p.id_peca)).filter(Boolean).map(p => p.estacao).filter(e => ESTACOES.includes(e));
  return [...new Set(dasPecas)];
}

// Lista de barras finas feitas só com HTML/CSS (sem biblioteca de gráficos):
// rótulo à esquerda, barra no meio e número à direita.
function barras(idLista, rotulos, valores) {
  const maximo = Math.max(1, ...valores);
  $(idLista).innerHTML = rotulos.map((rotulo, i) => `
    <li>
      <span class="rotuloBarra">${rotulo}</span>
      <span class="trilhaBarra"><span class="preenchimentoBarra" style="width:${(valores[i] / maximo) * 100}%"></span></span>
      <span class="valorBarra">${valores[i]}</span>
    </li>`).join('');
}

// [NOVO] Aba RESUMO: no lugar dos 5 gráficos (pedido: "menos gráfico"),
// só duas listas de barras simples e as peças que ainda não foram usadas.
function renderizarResumo() {
  const porEstacao = contar(looksCliente.flatMap(estacoesDoLook));
  barras('barrasEstacao', ESTACOES, ESTACOES.map(e => porEstacao[e] || 0));

  const porParte = contar(pecasCliente.map(parteDaPeca));
  barras('barrasParte', Object.values(PARTES_CORPO), Object.keys(PARTES_CORPO).map(p => porParte[p] || 0));

  const usadas = new Set(looksCliente.flatMap(l => l.pecas.map(p => p.id_peca)));
  const semUso = pecasCliente.filter(p => !usadas.has(p.id_peca));
  $('textoSemUso').textContent = pecasCliente.length === 0
    ? 'Nenhuma peça cadastrada ainda.'
    : semUso.length
      ? `${plural(semUso.length, 'peça ainda não aparece', 'peças ainda não aparecem')} em nenhum look. Boas opções para os próximos!`
      : 'Todas as peças já foram usadas em looks.';
  $('miniaturasSemUso').innerHTML = semUso.slice(0, 12).map(p => `
    <button type="button" class="miniatura" data-id="${p.id_peca}" title="${escaparHtml(p.titulo)}">
      <img src="${p.imagem || IMAGEM_PADRAO}" alt="${escaparHtml(p.titulo)}" loading="lazy">
    </button>`).join('');
  $('miniaturasSemUso').querySelectorAll('.miniatura').forEach(b => b.addEventListener('click', () => abrirPostPeca(b.dataset.id)));
}


/* =====================================================================
   14. CADASTROS E EXCLUSÕES
   ===================================================================== */

function iniciarCadastroCliente() {
  const abrir = () => abrirModal('balaoLogin');
  $('btnAbrirLogin').addEventListener('click', abrir);
  $('btnNovoStory').addEventListener('click', abrir);

  // a página recarrega depois do cadastro: sucesso vira aviso rápido; erro reabre o formulário
  const msg = $('balaoLogin').querySelector('.msgRetorno');
  if (msg && msg.classList.contains('sucesso')) { mostrarToast(msg.textContent.trim()); msg.remove(); }
  else if (msg) abrirModal('balaoLogin');
}

// botão "..." do perfil: abre o menu com Categorias e Excluir cliente
function iniciarMenuPerfil() {
  $('btnMaisPerfil').addEventListener('click', () => abrirModal('modalMais'));
  $('opcaoCategorias').addEventListener('click', () => {
    fecharModal('modalMais');
    $('msgCategoria').hidden = true;
    abrirModal('balaoCategorias');
  });
  $('opcaoExcluirCliente').addEventListener('click', () => {
    const ativo = clienteAtivo();
    if (!ativo) return;
    idClienteExcluir = ativo.dataset.id;
    $('textoConfirmacao').textContent = `Todas as peças e looks de "${ativo.dataset.nome}" serão apagados. Essa ação não pode ser desfeita.`;
    fecharModal('modalMais');
    abrirModal('modalConfirmacao');
  });
}

function iniciarAdicionarPeca() {
  const inputFoto = $('imagem');

  $('btnAdicionarPeca').addEventListener('click', () => {
    if (!idClienteAtivo()) return;
    // o id do cliente vai escondido no formulário: a rota /adicionar_peca precisa dele
    $('inputIdCliente').value = idClienteAtivo();
    abrirModal('balaoAdicionarPeca');
  });

  // pré-visualização da foto escolhida
  inputFoto.addEventListener('change', () => {
    const arquivo = inputFoto.files[0];
    const previa = $('previaFoto');
    if (!arquivo) { previa.hidden = true; $('textoAreaFoto').hidden = false; return; }
    const leitor = new FileReader();
    leitor.onload = e => { previa.src = e.target.result; previa.hidden = false; $('textoAreaFoto').hidden = true; };
    leitor.readAsDataURL(arquivo);
  });

  // [NOVO] arrastar a foto do computador direto para a área de foto
  const areaFoto = $('areaFoto');
  areaFoto.addEventListener('dragover', e => { e.preventDefault(); areaFoto.classList.add('sobre'); });
  areaFoto.addEventListener('dragleave', () => areaFoto.classList.remove('sobre'));
  areaFoto.addEventListener('drop', e => {
    e.preventDefault();
    areaFoto.classList.remove('sobre');
    if (e.dataTransfer.files.length) {
      inputFoto.files = e.dataTransfer.files;
      inputFoto.dispatchEvent(new Event('change'));
    }
  });

  // trava o botão enquanto envia (a foto pode demorar a subir)
  $('formAdicionarPeca').addEventListener('submit', () => {
    salvarPreferencia('aba', 'pecas');
    $('btnEnviarPeca').disabled = true;
    $('btnEnviarPeca').textContent = 'Enviando...';
  });

  const msg = $('balaoAdicionarPeca').querySelector('.msgRetorno');
  if (msg && msg.classList.contains('sucesso')) { mostrarToast(msg.textContent.trim()); msg.remove(); }
  else if (msg) { $('inputIdCliente').value = idClienteAtivo() || ''; abrirModal('balaoAdicionarPeca'); }
}

function iniciarExclusoes() {
  // ---- cliente ----
  $('btnNao').addEventListener('click', () => { fecharModal('modalConfirmacao'); idClienteExcluir = null; });
  $('btnSim').addEventListener('click', async () => {
    if (!idClienteExcluir) return;
    $('btnSim').disabled = true;
    const res = await fetch(`/excluir_cliente/${idClienteExcluir}`, { method: 'POST' });
    $('btnSim').disabled = false;
    fecharModal('modalConfirmacao');
    if (res.ok) {
      salvarPreferencia('cliente', '');
      window.location.reload();
    } else {
      mostrarToast('Não foi possível excluir o cliente.');
    }
    idClienteExcluir = null;
  });

  // ---- peça ----
  $('btnNaoPeca').addEventListener('click', () => { fecharModal('modalConfirmacaoPeca'); idPecaExcluir = null; });
  $('btnSimPeca').addEventListener('click', async () => {
    if (!idPecaExcluir) return;
    const res = await fetch(`/excluir_peca/${idPecaExcluir}`, { method: 'POST' });
    fecharModal('modalConfirmacaoPeca');
    idPecaExcluir = null;
    if (res.ok) { mostrarToast('Peça excluída'); carregarDadosCliente(idClienteAtivo()); }
    else mostrarToast('Não foi possível excluir a peça.');
  });

  // ---- look ----
  $('btnNaoLook').addEventListener('click', () => { fecharModal('modalConfirmacaoLook'); idLookExcluir = null; });
  $('btnSimLook').addEventListener('click', async () => {
    if (!idLookExcluir) return;
    const res = await fetch(`/excluir_look/${idLookExcluir}`, { method: 'POST' });
    fecharModal('modalConfirmacaoLook');
    idLookExcluir = null;
    if (res.ok) { mostrarToast('Look excluído'); carregarDadosCliente(idClienteAtivo()); }
    else mostrarToast('Não foi possível excluir o look.');
  });
}


/* =====================================================================
   14b. ANÚNCIOS — roupas para comprar  [NOVO]
   ---------------------------------------------------------------------
   A consultora cadastra peças de lojas (foto, preço, link). Elas aparecem
   no feed das clientes como "Patrocinado" e na aba COMPRAR delas.
   Rotas: GET /anuncios, POST /adicionar_anuncio, /alternar_anuncio/<id>,
   /excluir_anuncio/<id>.
   ===================================================================== */

var anuncios = [];

function carregarAnuncios() {
  return fetch('/anuncios')
    .then(res => (res.ok ? res.json() : []))
    .then(lista => { anuncios = lista || []; renderizarListaAnuncios(); })
    .catch(() => console.error('Erro ao carregar anúncios'));
}

function renderizarListaAnuncios() {
  const lista = $('listaAnuncios');
  if (anuncios.length === 0) {
    lista.innerHTML = '<li class="dicaVazia">Nenhum anúncio ainda. O primeiro que você publicar aparece no feed das clientes.</li>';
    return;
  }
  lista.innerHTML = anuncios.map(a => `
    <li class="${a.ativo ? '' : 'pausado'}">
      <img src="${escaparHtml(a.imagem)}" alt="">
      <span class="textoAnuncio">
        <strong>${escaparHtml(a.titulo)}</strong>
        <small>${escaparHtml(a.loja || 'Sem loja')}${a.preco !== null ? ' · ' + Number(a.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}
          · ${a.id_cliente ? 'só para ' + escaparHtml(a.cliente_nome || 'uma cliente') : 'todas as clientes'}${a.ativo ? '' : ' · pausado'}</small>
      </span>
      <button class="botao botaoSecundario" type="button" data-alternar="${a.id_anuncio}">${a.ativo ? 'Pausar' : 'Ativar'}</button>
      <button class="botao botaoTexto excluirAnuncio" type="button" data-excluir="${a.id_anuncio}">Excluir</button>
    </li>`).join('');

  lista.querySelectorAll('[data-alternar]').forEach(b => b.addEventListener('click', async () => {
    const res = await fetch(`/alternar_anuncio/${b.dataset.alternar}`, { method: 'POST' });
    if (res.ok) carregarAnuncios(); else mostrarToast('Não foi possível atualizar o anúncio.');
  }));
  lista.querySelectorAll('[data-excluir]').forEach(b => b.addEventListener('click', async () => {
    // confirmação simples: excluir anúncio não apaga nada do guarda-roupa
    if (!confirm('Excluir este anúncio?')) return;
    const res = await fetch(`/excluir_anuncio/${b.dataset.excluir}`, { method: 'POST' });
    if (res.ok) { mostrarToast('Anúncio excluído'); carregarAnuncios(); }
    else mostrarToast('Não foi possível excluir o anúncio.');
  }));
}

function iniciarAnuncios() {
  const form = $('formAnuncio');
  const inputFoto = $('imagemAnuncio');
  const msg = $('msgAnuncio');

  $('btnAnuncios').addEventListener('click', () => {
    // a opção "só para ..." usa a cliente que está selecionada nos stories
    const ativo = clienteAtivo();
    $('nomeClienteAnuncio').textContent = ativo ? ativo.dataset.nome : 'a cliente selecionada';
    $('anuncioSoCliente').disabled = !ativo;
    msg.hidden = true;
    abrirModal('balaoAnuncios');
    carregarAnuncios();
  });

  // prévia da foto escolhida
  inputFoto.addEventListener('change', () => {
    const arquivo = inputFoto.files[0];
    if (!arquivo) { $('previaAnuncio').hidden = true; $('textoAreaAnuncio').hidden = false; return; }
    const leitor = new FileReader();
    leitor.onload = e => { $('previaAnuncio').src = e.target.result; $('previaAnuncio').hidden = false; $('textoAreaAnuncio').hidden = true; };
    leitor.readAsDataURL(arquivo);
  });
  // prévia também quando cola o link da imagem
  $('linkImagemAnuncio').addEventListener('change', e => {
    if (inputFoto.files.length || !/^https?:\/\//i.test(e.target.value)) return;
    $('previaAnuncio').src = e.target.value; $('previaAnuncio').hidden = false; $('textoAreaAnuncio').hidden = true;
  });

  // envia com FormData (multipart), porque pode ter arquivo de foto
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const dados = new FormData(form);
    if ($('anuncioSoCliente').checked && idClienteAtivo()) dados.append('id_cliente', idClienteAtivo());
    $('btnSalvarAnuncio').disabled = true;
    try {
      const res = await fetch('/adicionar_anuncio', { method: 'POST', body: dados });
      const resposta = await res.json().catch(() => ({}));
      if (!res.ok) { mostrarMensagem(msg, resposta.erro || 'Erro ao salvar o anúncio.', 'erro'); return; }
      form.reset();
      $('anuncioSoCliente').checked = false;
      $('previaAnuncio').hidden = true; $('textoAreaAnuncio').hidden = false;
      mostrarMensagem(msg, 'Anúncio publicado! Ele já aparece no feed das clientes.', 'sucesso');
      carregarAnuncios();
    } catch {
      mostrarMensagem(msg, 'Erro ao salvar o anúncio.', 'erro');
    } finally {
      $('btnSalvarAnuncio').disabled = false;
    }
  });
}


/* =====================================================================
   15. INÍCIO
   A ordem importa: modais e filtros primeiro, depois as abas (que leem
   a aba salva) e por último o cliente (que dispara o carregamento).
   ===================================================================== */
iniciarModais();
iniciarFiltroClientes();
iniciarAbas();
iniciarFiltroPecas();
iniciarCategorias();
iniciarFiltroCloset();
iniciarArrastarSoltar();
iniciarSalvarLook();
iniciarFiltroLooks();
iniciarExclusoes();
iniciarCadastroCliente();
iniciarMenuPerfil();
iniciarAnuncios();
carregarCategorias();
carregarCategoriasLook();
iniciarClientes();
iniciarAdicionarPeca();   // depois de iniciarClientes: usa o id do cliente ativo
