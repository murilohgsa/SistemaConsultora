/* =====================================================================
   LOOKS NA TELA DO CLIENTE (feed / Guarda Roupa)
   ---------------------------------------------------------------------
   Fluxo:
   1. Busca /meus_looks: os looks que a consultora criou para o cliente logado.
   2. Monta os filtros: "Todos", "Favoritos" e as categorias de look que
      aparecem nesses looks (Inverno, Festa, Casamento...).
   3. Mostra os looks em cards com o "boneco" (função montarBoneco do boneco.js).
   4. A busca filtra pelo nome do look ou pelo nome de alguma peça.
   5. Clicar num card abre o detalhe do look; a estrela marca como favorito
      (/favoritar_look/<id>).
   6. Se a página abrir com ?look=ID (vindo de uma notificação), já abre
      o detalhe daquele look.
   Precisa do static/boneco.js carregado antes.
   ===================================================================== */

const gradeLooks = document.getElementById('gradeLooks');
const filtrosLooks = document.getElementById('filtrosLooks');
const buscaLooks = document.getElementById('buscaLooks');
const contagemLooks = document.getElementById('contagemLooks');
const modalDetalheLook = document.getElementById('modalDetalheLook');
const conteudoDetalheLook = document.getElementById('conteudoDetalheLook');

var meusLooks = [];          // looks do cliente, vindos de /meus_looks
var filtroAtivo = 'todos';   // 'todos', 'favoritos' ou o id de uma categoria de look
var textoBusca = '';         // o que foi digitado na busca (já em minúsculas)

// Ícone da estrela (mesmo desenho que já existia no feed)
const ICONE_ESTRELA = '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.4 5.9.9-4.3 4.2 1 6-5.2-2.8-5.2 2.8 1-6-4.3-4.2 5.9-.9Z"/></svg>';

// Tira acentos e deixa minúsculo, para "calca" achar "Calça" na busca
function normalizar(texto) {
  return (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function buscarLookPorId(idLook) {
  return meusLooks.find(look => look.id_look === Number(idLook));
}

// Aplica o filtro escolhido e a busca, e devolve os looks que sobram
function looksFiltrados() {
  return meusLooks.filter(look => {
    if (filtroAtivo === 'favoritos' && !look.is_favorito) return false;
    if (filtroAtivo !== 'todos' && filtroAtivo !== 'favoritos' &&
        !look.categorias.some(cat => cat.id_categoria_look === filtroAtivo)) return false;

    if (!textoBusca) return true;
    // procura no nome do look e no nome de cada peça
    const textos = [look.titulo, ...look.pecas.map(peca => peca.titulo)];
    return textos.some(texto => normalizar(texto).includes(textoBusca));
  });
}

/* ---------- filtros ---------- */

// Monta os botões de filtro com a quantidade de looks em cada um
function renderizarFiltros() {
  // junta as categorias usadas nos looks, contando quantos looks cada uma tem
  const categorias = {};
  meusLooks.forEach(look => look.categorias.forEach(cat => {
    categorias[cat.id_categoria_look] = categorias[cat.id_categoria_look] || { ...cat, total: 0 };
    categorias[cat.id_categoria_look].total++;
  }));
  const listaCategorias = Object.values(categorias).sort((a, b) => a.nome.localeCompare(b.nome));
  const totalFavoritos = meusLooks.filter(look => look.is_favorito).length;

  const botao = (valor, rotulo, total) => `
    <button type="button" class="chipFiltroLook" data-filtro="${valor}"
            aria-pressed="${String(filtroAtivo) === String(valor)}">
      ${rotulo} <span class="totalFiltro">${total}</span>
    </button>`;

  filtrosLooks.innerHTML =
    botao('todos', 'Todos', meusLooks.length) +
    botao('favoritos', `${ICONE_ESTRELA} Favoritos`, totalFavoritos) +
    listaCategorias.map(cat => botao(cat.id_categoria_look, escaparHtml(cat.nome), cat.total)).join('');

  filtrosLooks.querySelectorAll('.chipFiltroLook').forEach(btn => {
    btn.addEventListener('click', () => {
      const valor = btn.dataset.filtro;
      // categorias são números; 'todos' e 'favoritos' continuam texto
      filtroAtivo = isNaN(valor) ? valor : Number(valor);
      renderizarFiltros();
      renderizarGrade();
    });
  });
}

/* ---------- grade de looks ---------- */

function renderizarGrade() {
  const looks = looksFiltrados();
  contagemLooks.textContent = meusLooks.length
    ? `${looks.length} ${looks.length === 1 ? 'look' : 'looks'}`
    : '';

  if (meusLooks.length === 0) {
    gradeLooks.innerHTML = `
      <li class="avisoLooks">
        Sua consultora ainda não criou looks para você.<br>
        Quando ela criar, você recebe um aviso no sininho.
      </li>`;
    return;
  }

  if (looks.length === 0) {
    gradeLooks.innerHTML = '<li class="avisoLooks">Nenhum look encontrado com esse filtro ou busca.</li>';
    return;
  }

  gradeLooks.innerHTML = looks.map(look => `
    <li class="itemLook">
      <button class="cardMeuLook" type="button" data-id="${look.id_look}"
              aria-label="Abrir o look ${escaparHtml(look.titulo)}">
        <span class="fundoMeuLook">${montarBoneco(look.pecas)}</span>
        <span class="infoMeuLook">
          <span class="nomeMeuLook">${escaparHtml(look.titulo)}</span>
          <span class="tagsMeuLook">
            ${look.categorias.map(cat => `<span>${escaparHtml(cat.nome)}</span>`).join('')}
          </span>
        </span>
      </button>
      <!-- a estrela fica fora do botão do card (botão dentro de botão não é permitido) -->
      <button class="estrela" type="button" data-id="${look.id_look}" aria-pressed="${look.is_favorito}"
              aria-label="${look.is_favorito ? 'Remover dos' : 'Adicionar aos'} favoritos: ${escaparHtml(look.titulo)}">
        ${ICONE_ESTRELA}
      </button>
    </li>
  `).join('');

  gradeLooks.querySelectorAll('.cardMeuLook').forEach(card => {
    card.addEventListener('click', () => abrirDetalheLook(card.dataset.id));
  });
  gradeLooks.querySelectorAll('.estrela').forEach(btn => {
    btn.addEventListener('click', () => alternarFavorito(btn.dataset.id));
  });
}

/* ---------- favorito ---------- */

async function alternarFavorito(idLook) {
  const look = buscarLookPorId(idLook);
  if (!look) return;

  // muda na tela na hora (fica mais rápido); se o servidor der erro, desfaz
  look.is_favorito = !look.is_favorito;
  atualizarTelaDepoisDoFavorito(idLook);

  try {
    const res = await fetch(`/favoritar_look/${idLook}`, { method: 'POST' });
    if (!res.ok) throw new Error();
    const dados = await res.json();
    look.is_favorito = dados.is_favorito;
  } catch {
    look.is_favorito = !look.is_favorito;
  }
  atualizarTelaDepoisDoFavorito(idLook);
}

function atualizarTelaDepoisDoFavorito(idLook) {
  renderizarFiltros();
  renderizarGrade();
  // se o detalhe desse look estiver aberto, atualiza o botão de lá também
  if (modalDetalheLook.classList.contains('aberto') && modalDetalheLook.dataset.id === String(idLook)) {
    abrirDetalheLook(idLook);
  }
}

/* ---------- detalhe do look ---------- */

function abrirDetalheLook(idLook) {
  const look = buscarLookPorId(idLook);
  if (!look) return;

  const data = look.data
    ? new Date(look.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  // peças separadas por parte do corpo (cabeça, tronco...)
  const partes = Object.entries(PARTES_CORPO).map(([parte, nomeParte]) => {
    const pecas = look.pecas.filter(peca => (PARTES_CORPO[peca.parte_corpo] ? peca.parte_corpo : 5) === Number(parte));
    if (pecas.length === 0) return '';
    return `
      <div class="parteDetalhe">
        <span class="nomeParteDetalhe">${nomeParte}</span>
        <ul class="pecasDetalhe">
          ${pecas.map(peca => `
            <li>
              <img src="${peca.imagem || '/static/img/peca_padrao.png'}" alt="">
              <span>
                <strong>${escaparHtml(peca.titulo)}</strong>
                <small>${escaparHtml(peca.categoria_nome)}</small>
              </span>
            </li>`).join('')}
        </ul>
      </div>`;
  }).join('');

  conteudoDetalheLook.innerHTML = `
    <div class="gradeDetalheLook">
      <div class="bonecoDetalhe">${montarBoneco(look.pecas)}</div>
      <div class="infoDetalhe">
        <h3 id="tituloDetalheLook">${escaparHtml(look.titulo)}</h3>
        ${data ? `<p class="dataDetalhe">Criado em ${data}</p>` : ''}
        <div class="tagsMeuLook">
          ${look.categorias.map(cat => `<span>${escaparHtml(cat.nome)}</span>`).join('')}
        </div>
        <button class="botaoFavoritoDetalhe" type="button" aria-pressed="${look.is_favorito}">
          ${ICONE_ESTRELA} ${look.is_favorito ? 'Favorito' : 'Marcar como favorito'}
        </button>
        ${partes}
      </div>
    </div>
  `;

  conteudoDetalheLook.querySelector('.botaoFavoritoDetalhe')
    .addEventListener('click', () => alternarFavorito(look.id_look));

  modalDetalheLook.dataset.id = look.id_look;
  modalDetalheLook.classList.add('aberto');
  document.body.style.overflow = 'hidden';   // trava a rolagem do fundo
}

function fecharDetalheLook() {
  modalDetalheLook.classList.remove('aberto');
  document.body.style.overflow = '';
}

/* ---------- início ---------- */

function carregarMeusLooks() {
  fetch('/meus_looks')
    .then(res => res.json())
    .then(looks => {
      meusLooks = Array.isArray(looks) ? looks : [];
      renderizarFiltros();
      renderizarGrade();

      // veio de uma notificação (/feed?look=ID): abre o look direto
      const idDaUrl = new URLSearchParams(location.search).get('look');
      if (idDaUrl) abrirDetalheLook(idDaUrl);
    })
    .catch(() => {
      gradeLooks.innerHTML = '<li class="avisoLooks">Erro ao carregar seus looks.</li>';
    });
}

function iniciarLooksCliente() {
  if (!gradeLooks) return;

  // busca: filtra enquanto digita
  buscaLooks.addEventListener('input', () => {
    textoBusca = normalizar(buscaLooks.value.trim());
    renderizarGrade();
  });

  // lupa do topo leva até o campo de busca
  const btnBuscar = document.getElementById('btnBuscarLooks');
  if (btnBuscar) btnBuscar.addEventListener('click', () => buscaLooks.focus());

  // fechar o detalhe: X, clique no fundo escuro ou ESC
  document.getElementById('fecharDetalheLook').addEventListener('click', fecharDetalheLook);
  modalDetalheLook.addEventListener('click', (e) => { if (e.target === modalDetalheLook) fecharDetalheLook(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharDetalheLook(); });

  carregarMeusLooks();
}

// usado pelo notificacoes.js para abrir um look ao clicar na notificação
window.abrirLookCliente = (idLook) => {
  if (buscarLookPorId(idLook)) {
    abrirDetalheLook(idLook);
  } else {
    // look novo que ainda não estava na tela: recarrega a lista antes
    history.replaceState(null, '', `/feed?look=${idLook}`);
    carregarMeusLooks();
  }
};

iniciarLooksCliente();
