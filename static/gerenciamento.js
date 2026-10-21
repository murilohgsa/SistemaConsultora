const balao = document.getElementById('balaoLogin');
const btnAbrirLogin = document.getElementById('btnAbrirLogin');
const itensCliente = document.querySelectorAll('.itemCliente');
const nomeClienteAtivo = document.getElementById('nomeClienteAtivo');
const fotoClienteAtivo = document.querySelector('.cabecalhoCliente img');
const modal = document.getElementById('modalConfirmacao');
const btnSim = document.getElementById('btnSim');
const btnNao = document.getElementById('btnNao');

var idClienteExcluir = null;
var idPecaExcluir = null;


function abrirBalao() {
  balao.classList.add('aberto');
  btnAbrirLogin.setAttribute('aria-expanded', true);
}

function fecharBalao() {
  balao.classList.remove('aberto');
  btnAbrirLogin.setAttribute('aria-expanded', false);
  const msgRetorno = balao.querySelector('.msgRetorno');
  if (msgRetorno) msgRetorno.remove();
  balao.querySelectorAll('input[type="email"], input[type="password"], input[type="text"]')
    .forEach(input => input.value = '');
}

function iniciarAbas() {
  const abas = document.querySelectorAll('.abaCliente');
  const paineis = document.querySelectorAll('.painelAba');

  abas.forEach(aba => {
    aba.addEventListener('click', () => {
      abas.forEach(a => a.setAttribute('aria-selected', 'false'));
      paineis.forEach(p => p.style.display = 'none');
      aba.setAttribute('aria-selected', 'true');
      document.getElementById('painel-' + aba.dataset.aba).style.display = 'block';

      if (aba.dataset.aba === 'pecas') {
        const clienteAtivo = document.querySelector('.itemCliente[aria-current="true"]');
        if (clienteAtivo) carregarPecas(clienteAtivo.dataset.id);
      }

      // aba de looks: carrega as peças (para as bolinhas) e os looks já criados
      if (aba.dataset.aba === 'looks') {
        const clienteAtivo = document.querySelector('.itemCliente[aria-current="true"]');
        if (clienteAtivo) carregarDadosLooks(clienteAtivo.dataset.id);
      }
    });
  });
}

function carregarPecas(idCliente) {
  const painel = document.getElementById('painelPecas');
  painel.innerHTML = '<div class="carregandoPecas"><span>Carregando peças...</span></div>';

  fetch(`/pecas/${idCliente}`)
    .then(res => res.json())
    .then(dados => {
      if (!dados || dados.length === 0) {
        painel.innerHTML = '<p class="semPecas">Nenhuma peça cadastrada para este cliente.</p>';
        return;
      }

      const grupos = {};
      dados.forEach(peca => {
        const cat = peca.categoria_nome || 'Sem categoria';
        if (!grupos[cat]) grupos[cat] = [];
        grupos[cat].push(peca);
      });

      painel.innerHTML = Object.entries(grupos).map(([categoria, pecas]) => `
        <div class="grupoPecas">
          <h3 class="tituloCategoria">${categoria}</h3>
          <div class="wrapperCarrossel">
            <button class="setaCarrosselPecas setaEsquerda" type="button" onclick="this.nextElementSibling.scrollBy({left: -320, behavior: 'smooth'})">
              <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>
            </button>
            <div class="carrosselPecas" id="carrossel-${categoria}">
              ${pecas.map(peca => `
                <div class="cardPeca">
                  <div class="imagemPecaWrapper">
                    <img class="imagemPeca"
                         src="${peca.imagem || '/static/img/peca_padrao.png'}"
                         alt="${peca.titulo}">
                    <button class="btnExcluirPeca" type="button"
                            data-id="${peca.id_peca}"
                            aria-label="Excluir peça">
                      <svg viewBox="0 0 24 24">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                      </svg>
                    </button>
                  </div>
                  <span class="tituloPeca">${peca.titulo}</span>
                </div>
              `).join('')}
            </div>
            <button class="setaCarrosselPecas setaDireita" type="button"
                    onclick="this.previousElementSibling.scrollBy({left: 320, behavior: 'smooth'})">
              <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      `).join('');

      // eventos da seta

      document.querySelectorAll('.carrosselPecas').forEach(carrossel => {
        const wrapper = carrossel.closest('.wrapperCarrossel');
        const setaEsq = wrapper.querySelector('.setaEsquerda');
        const setaDir = wrapper.querySelector('.setaDireita');

        function atualizarSetas(){
          setaEsq.style.visibility = carrossel.scrollLeft > 0 ? 'visible' : 'hidden';
          const noFim = carrossel.scrollLeft + carrossel.clientWidth >= carrossel.scrollWidth - 4;

          setaDir.style.visibility = noFim ? 'hidden' : 'visible';
        }

        atualizarSetas();

        carrossel.addEventListener('scroll', atualizarSetas);
      });


      // eventos da lixeira
      document.querySelectorAll('.btnExcluirPeca').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          idPecaExcluir = btn.dataset.id;
          document.getElementById('modalConfirmacaoPeca').classList.add('aberto');
        });
      });
    })
    .catch(() => {
      painel.innerHTML = '<p class="semPecas">Erro ao carregar peças.</p>';
    });
}

function excluirPeca(idPeca) {
  fetch(`/excluir_peca/${idPeca}`, { method: 'POST' })
    .then(res => {
      if (res.ok) {
        const clienteAtivo = document.querySelector('.itemCliente[aria-current="true"]');
        if (clienteAtivo) carregarPecas(clienteAtivo.dataset.id);
      }
    })
    .catch(err => console.log('erro:', err));
}

function iniciarModalPeca() {
  const modalPeca = document.getElementById('modalConfirmacaoPeca');
  const btnSimPeca = document.getElementById('btnSimPeca');
  const btnNaoPeca = document.getElementById('btnNaoPeca');

  if (!modalPeca || !btnSimPeca || !btnNaoPeca) return;

  btnNaoPeca.addEventListener('click', () => {
    modalPeca.classList.remove('aberto');
    idPecaExcluir = null;
  });

  btnSimPeca.addEventListener('click', () => {
    if (!idPecaExcluir) return;
    excluirPeca(idPecaExcluir);
    modalPeca.classList.remove('aberto');
    idPecaExcluir = null;
  });

  modalPeca.addEventListener('click', (e) => {
    if (e.target === modalPeca) {
      modalPeca.classList.remove('aberto');
      idPecaExcluir = null;
    }
  });
}

function iniciarBalao() {
  const temMensagem = balao.querySelector('.msgRetorno');
  if (temMensagem) abrirBalao();

  btnAbrirLogin.addEventListener('click', (e) => {
    e.stopPropagation();
    balao.classList.contains('aberto') ? fecharBalao() : abrirBalao();
  });

  balao.addEventListener('click', (e) => e.stopPropagation());

  document.addEventListener('click', (e) => {
    if (!balao.contains(e.target) && e.target !== btnAbrirLogin) fecharBalao();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharBalao();
  });

  const inputSenha = balao.querySelector('input[type="password"]');
  const btnCadastrar = balao.querySelector('button[type="submit"]');
  if (inputSenha && btnCadastrar) {
    inputSenha.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnCadastrar.click();
    });
  }
}

function ativarCliente(btn) {
  itensCliente.forEach(b => b.removeAttribute('aria-current'));
  btn.setAttribute('aria-current', 'true');
  nomeClienteAtivo.textContent = btn.dataset.nome;
  fotoClienteAtivo.src = btn.dataset.foto;
  fotoClienteAtivo.alt = btn.dataset.nome;

  const abaAtiva = document.querySelector('.abaCliente[aria-selected="true"]');
  if (abaAtiva && abaAtiva.dataset.aba === 'pecas') {
    carregarPecas(btn.dataset.id);
  }

  // trocou de cliente: o look em montagem era do cliente anterior, então zera
  limparLookAtual();
  if (abaAtiva && abaAtiva.dataset.aba === 'looks') {
    carregarDadosLooks(btn.dataset.id);
  }
}

function trocarCliente() {
  itensCliente.forEach(btn => {
    btn.addEventListener('click', () => ativarCliente(btn));
  });
  if (itensCliente.length > 0) ativarCliente(itensCliente[0]);
}

function iniciarOpcoesClientes() {
  document.querySelectorAll('.linhaCliente').forEach(item => {
    const btnOpcoes  = item.querySelector('.btnOpcoes');
    const menuOpcoes = item.querySelector('.menuOpcoes');
    const btnExcluir = item.querySelector('.opcaoExcluir');

    btnOpcoes.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.menuOpcoes.aberto').forEach(m => {
        if (m !== menuOpcoes) m.classList.remove('aberto');
      });
      const rect = btnOpcoes.getBoundingClientRect();
      menuOpcoes.style.top   = rect.bottom + 4 + 'px';
      menuOpcoes.style.right = window.innerWidth - rect.right + 'px';
      menuOpcoes.style.left  = 'auto';
      menuOpcoes.classList.toggle('aberto');
    });

    menuOpcoes.addEventListener('click', (e) => e.stopPropagation());

    btnExcluir.addEventListener('click', (e) => {
      e.stopPropagation();
      idClienteExcluir = btnExcluir.dataset.id;
      const nome = btnExcluir.dataset.nome;
      document.getElementById('textoConfirmacao').textContent =
        `Deseja realmente excluir o cliente "${nome}"?`;
      modal.classList.add('aberto');
      menuOpcoes.classList.remove('aberto');
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.menuOpcoes.aberto').forEach(m => m.classList.remove('aberto'));
  });
}

function iniciarModal() {
  btnNao.addEventListener('click', () => {
    modal.classList.remove('aberto');
    idClienteExcluir = null;
  });

  btnSim.addEventListener('click', async () => {
    if (!idClienteExcluir) return;
    const res = await fetch(`/excluir_cliente/${idClienteExcluir}`, { method: 'POST' });
    if (res.ok) {
      window.location.reload();
    }
    modal.classList.remove('aberto');
    idClienteExcluir = null;
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('aberto');
      idClienteExcluir = null;
    }
  });
}

function abrirBalaoAdicionarPeca() {
  const balao = document.getElementById('balaoAdicionarPeca');
  const overlay = document.getElementById('overlayAdicionarPeca');
  balao.classList.add('aberto');
  if (overlay) overlay.classList.add('aberto');
}

function fecharBalaoAdicionarPeca() {
  const balao = document.getElementById('balaoAdicionarPeca');
  const overlay = document.getElementById('overlayAdicionarPeca');
  balao.classList.remove('aberto');
  if (overlay) overlay.classList.remove('aberto');
  document.getElementById('formAdicionarPeca').reset();
}

function iniciarBalaoAdicionarPeca() {
  const btn = document.getElementById('btnAdicionarPeca');
  const balao = document.getElementById('balaoAdicionarPeca');

  if (!btn || !balao) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const clienteAtivo = document.querySelector('.itemCliente[aria-current="true"]');
    if (!clienteAtivo) return;
    // Antes aqui redirecionava para /adicionar_peca_cliente, rota que não existe (dava 404).
    // Agora abre o balão e preenche o id do cliente no campo escondido do formulário,
    // que a rota /adicionar_peca precisa para saber de quem é a peça.
    balao.classList.contains('aberto') ? fecharBalaoAdicionarPeca() : abrirBalaoAdicionarPeca();
    document.getElementById('inputIdCliente').value = clienteAtivo.dataset.id;
  });

  balao.addEventListener('click', (e) => e.stopPropagation());

  document.addEventListener('click', (e) => {
    if (!balao.contains(e.target) && e.target !== btn) fecharBalaoAdicionarPeca();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharBalaoAdicionarPeca();
  });
}

function carregarCategorias() {
  const select = document.getElementById('categoriaPeca');
  if (!select) return;

  fetch('/categorias')
    .then(res => res.json())
    .then(categorias => {
      categoriasPeca = categorias;
      preencherSelectCategorias();
      renderizarListaCategorias();
    })
    .catch(() => console.log('Erro ao carregar categorias'));
}


/* =====================================================================
   CATEGORIAS DE PEÇA
   ---------------------------------------------------------------------
   Cada categoria (Calça, Sapato, Boné...) tem uma parte_corpo (1 a 5).
   É por ela que a silhueta sabe quais peças mostrar em cada bolinha.
   ===================================================================== */

var categoriasPeca = [];   // lista vinda de /categorias: [{id_categoria, nome, parte_corpo}]

// Preenche o <select> de categoria do formulário "Nova Peça",
// agrupando as opções por parte do corpo com <optgroup>
function preencherSelectCategorias() {
  const select = document.getElementById('categoriaPeca');
  if (!select) return;

  const valorAtual = select.value;
  select.innerHTML = '<option value="" disabled selected>Selecione...</option>';

  // um grupo para cada parte do corpo + um grupo final para categorias sem parte
  const grupos = [...Object.keys(PARTES_CORPO).map(Number), null];
  grupos.forEach(parte => {
    const daParte = categoriasPeca.filter(cat => (cat.parte_corpo || null) === parte);
    if (daParte.length === 0) return;

    const optgroup = document.createElement('optgroup');
    optgroup.label = parte ? PARTES_CORPO[parte] : 'Sem parte do corpo';
    daParte.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id_categoria;
      option.textContent = cat.nome;
      optgroup.appendChild(option);
    });
    select.appendChild(optgroup);
  });

  if (valorAtual) select.value = valorAtual;
}

// Mostra, dentro do balão de categorias, as categorias existentes por parte do corpo
function renderizarListaCategorias() {
  const lista = document.getElementById('listaCategorias');
  if (!lista) return;

  lista.innerHTML = Object.entries(PARTES_CORPO).map(([parte, nomeParte]) => {
    const daParte = categoriasPeca.filter(cat => cat.parte_corpo === Number(parte));
    return `
      <div class="grupoCategoriaParte">
        <span class="nomeParteCategoria">${nomeParte}</span>
        <div class="chipsCategoria">
          ${daParte.length
            ? daParte.map(cat => `<span class="chipCategoria">${escaparHtml(cat.nome)}</span>`).join('')
            : '<span class="chipCategoria vazio">Nenhuma</span>'}
        </div>
      </div>
    `;
  }).join('');
}

function abrirBalaoCategorias() {
  document.getElementById('balaoCategorias').classList.add('aberto');
  document.getElementById('overlayAdicionarPeca').classList.add('aberto');
  document.getElementById('nomeCategoria').focus();
}

function fecharBalaoCategorias() {
  const balao = document.getElementById('balaoCategorias');
  if (!balao.classList.contains('aberto')) return;
  balao.classList.remove('aberto');
  document.getElementById('overlayAdicionarPeca').classList.remove('aberto');
  document.getElementById('formCategoria').reset();
  document.getElementById('msgCategoria').hidden = true;
}

// Mostra a mensagem verde/vermelha usada nos formulários (mesmo estilo do .msgRetorno do cadastro)
function mostrarMensagem(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = `msgRetorno ${tipo}`;
  elemento.hidden = false;
}

function iniciarBalaoCategorias() {
  const btn = document.getElementById('btnCategorias');
  const balao = document.getElementById('balaoCategorias');
  const form = document.getElementById('formCategoria');
  const msg = document.getElementById('msgCategoria');
  if (!btn || !balao || !form) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    balao.classList.contains('aberto') ? fecharBalaoCategorias() : abrirBalaoCategorias();
  });

  // clique dentro do balão não fecha; clique fora ou ESC fecha
  balao.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', (e) => {
    if (!balao.contains(e.target) && e.target !== btn) fecharBalaoCategorias();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharBalaoCategorias();
  });

  // envia a nova categoria para o Flask (/adicionar_categoria) sem recarregar a página
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = form.nome.value.trim();
    const parte = form.querySelector('input[name="parte_corpo"]:checked');
    if (!nome || !parte) {
      mostrarMensagem(msg, 'Preencha o nome e escolha a parte do corpo.', 'erro');
      return;
    }

    try {
      const res = await fetch('/adicionar_categoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, parte_corpo: Number(parte.value) })
      });
      const dados = await res.json();
      if (!res.ok) {
        mostrarMensagem(msg, dados.erro || 'Erro ao cadastrar categoria.', 'erro');
        return;
      }

      // coloca a categoria nova na lista e atualiza select + lista do balão
      categoriasPeca.push(dados);
      categoriasPeca.sort((a, b) => a.nome.localeCompare(b.nome));
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
   ABA "ADICIONAR LOOKS"
   ---------------------------------------------------------------------
   Fluxo:
   1. Ao abrir a aba, busca as peças do cliente (/pecas/<id>) e os looks
      já salvos (/looks/<id>).
   2. Clicar numa bolinha da silhueta abre um modal com as peças daquela
      parte do corpo. Dá para marcar várias (ex.: vários acessórios).
   3. As peças marcadas aparecem no "Look em montagem", desenhadas como
      um boneco (cabeça em cima, pés embaixo, acessórios ao lado).
   4. A seta verde abre o modal de salvar: nome + categorias do look.
   5. O look salvo vai para a galeria "Looks criados".
   ===================================================================== */

var pecasCliente = [];        // todas as peças do cliente ativo (vêm de /pecas/<id>)
var looksCliente = [];        // looks salvos do cliente ativo (vêm de /looks/<id>)
var categoriasLook = [];      // categorias de look (Inverno, Festa...) de /categorias_look
var parteAberta = null;       // qual bolinha está aberta no modal (1 a 5)
var idLookExcluir = null;     // look que vai ser excluído (esperando o "Sim")

// Peças escolhidas no look em montagem, separadas por parte do corpo.
// Guardamos só os ids; os dados completos ficam em pecasCliente.
var lookAtual = { 1: [], 2: [], 3: [], 4: [], 5: [] };

function idClienteAtivo() {
  const clienteAtivo = document.querySelector('.itemCliente[aria-current="true"]');
  return clienteAtivo ? clienteAtivo.dataset.id : null;
}

// Busca as peças e os looks do cliente ao mesmo tempo (Promise.all)
function carregarDadosLooks(idCliente) {
  const galeria = document.getElementById('galeriaLooks');
  galeria.innerHTML = '<p class="semPecas">Carregando looks...</p>';

  Promise.all([
    fetch(`/pecas/${idCliente}`).then(res => res.json()),
    fetch(`/looks/${idCliente}`).then(res => res.json())
  ])
    .then(([pecas, looks]) => {
      // se o usuário trocou de cliente enquanto carregava, ignora a resposta antiga
      if (idCliente !== idClienteAtivo()) return;
      pecasCliente = pecas || [];
      looksCliente = looks || [];
      renderizarMontagem();
      renderizarGaleriaLooks();
    })
    .catch(() => {
      galeria.innerHTML = '<p class="semPecas">Erro ao carregar looks.</p>';
    });
}

// Busca uma peça pelo id dentro das peças já carregadas
function buscarPeca(idPeca) {
  return pecasCliente.find(p => p.id_peca === idPeca);
}

// Junta todas as peças escolhidas em uma lista só (usado no boneco e ao salvar)
function pecasDoLookAtual() {
  return Object.values(lookAtual).flat().map(buscarPeca).filter(Boolean);
}

function limparLookAtual() {
  lookAtual = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  renderizarMontagem();
}

// Atualiza o número que aparece em cima de cada bolinha da silhueta
function atualizarContadoresPontos() {
  document.querySelectorAll('.pontoCampo').forEach(ponto => {
    const total = lookAtual[ponto.dataset.parte].length;
    const contador = ponto.querySelector('.contadorPonto');
    contador.textContent = total;
    contador.hidden = total === 0;
    ponto.classList.toggle('preenchido', total > 0);
  });
}

// Desenha o "Look em montagem": boneco à esquerda e lista por parte à direita
function renderizarMontagem() {
  const coluna = document.getElementById('colunaLook');
  const btnLimpar = document.getElementById('btnLimparLook');
  const pecas = pecasDoLookAtual();

  atualizarContadoresPontos();
  btnLimpar.hidden = pecas.length === 0;

  if (pecas.length === 0) {
    coluna.innerHTML = `
      <div class="regiaoVazia">
        <span>Clique nos pontos da silhueta para adicionar peças ao look</span>
      </div>`;
    return;
  }

  // lista das peças escolhidas, separada por parte do corpo, com botão de remover
  const listaPartes = Object.entries(PARTES_CORPO)
    .filter(([parte]) => lookAtual[parte].length > 0)
    .map(([parte, nomeParte]) => `
      <div class="grupoRegiao">
        <span class="tituloRegiao">${nomeParte}</span>
        <div class="pecasSelecionadasRegiao">
          ${lookAtual[parte].map(buscarPeca).filter(Boolean).map(peca => `
            <div class="cardPecaSelecionada">
              <img src="${peca.imagem || '/static/img/peca_padrao.png'}" alt="${escaparHtml(peca.titulo)}">
              <button class="removerPeca" type="button" data-parte="${parte}" data-id="${peca.id_peca}"
                      aria-label="Remover ${escaparHtml(peca.titulo)} do look">
                <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

  coluna.innerHTML = `
    <div class="previaBoneco">${montarBoneco(pecas)}</div>
    <div class="listaPartesLook">${listaPartes}</div>
  `;

  // botão X de cada peça: tira a peça do look
  coluna.querySelectorAll('.removerPeca').forEach(btn => {
    btn.addEventListener('click', () => {
      const parte = btn.dataset.parte;
      lookAtual[parte] = lookAtual[parte].filter(id => id !== Number(btn.dataset.id));
      renderizarMontagem();
    });
  });
}

/* ---------- modal de escolher peças de uma parte ---------- */

function abrirModalParte(parte) {
  parteAberta = parte;
  document.getElementById('tituloModalPeca').textContent = `Peças — ${PARTES_CORPO[parte]}`;
  renderizarPecasModal();
  document.getElementById('modalSelecionarPeca').classList.add('aberto');
}

function fecharModalParte() {
  document.getElementById('modalSelecionarPeca').classList.remove('aberto');
  parteAberta = null;
}

// Lista no modal só as peças do cliente cuja categoria é da parte clicada
function renderizarPecasModal() {
  const lista = document.getElementById('listaPecasModal');
  const daParte = pecasCliente.filter(peca => peca.parte_corpo === parteAberta);

  if (daParte.length === 0) {
    lista.innerHTML = `
      <p class="avisoModalPeca">
        Nenhuma peça de <strong>${PARTES_CORPO[parteAberta]}</strong> cadastrada para este cliente.<br>
        Cadastre a peça na aba <strong>Peças</strong> usando uma categoria dessa parte do corpo.
      </p>`;
    return;
  }

  lista.innerHTML = daParte.map(peca => `
    <button type="button"
            class="cardPecaModal ${lookAtual[parteAberta].includes(peca.id_peca) ? 'selecionada' : ''}"
            data-id="${peca.id_peca}" aria-pressed="${lookAtual[parteAberta].includes(peca.id_peca)}">
      <img src="${peca.imagem || '/static/img/peca_padrao.png'}" alt="">
      <span>${escaparHtml(peca.titulo)}</span>
      <small>${escaparHtml(peca.categoria_nome)}</small>
    </button>
  `).join('');

  // clicar marca/desmarca a peça (permite várias peças na mesma parte)
  lista.querySelectorAll('.cardPecaModal').forEach(card => {
    card.addEventListener('click', () => {
      const id = Number(card.dataset.id);
      const escolhidas = lookAtual[parteAberta];
      lookAtual[parteAberta] = escolhidas.includes(id)
        ? escolhidas.filter(x => x !== id)
        : [...escolhidas, id];
      const marcada = lookAtual[parteAberta].includes(id);
      card.classList.toggle('selecionada', marcada);
      card.setAttribute('aria-pressed', marcada);
      renderizarMontagem();
    });
  });
}

function iniciarSilhueta() {
  document.querySelectorAll('.pontoCampo').forEach(ponto => {
    ponto.addEventListener('click', () => abrirModalParte(Number(ponto.dataset.parte)));
  });

  const modal = document.getElementById('modalSelecionarPeca');
  document.getElementById('fecharModalPeca').addEventListener('click', fecharModalParte);
  document.getElementById('btnConcluirPecas').addEventListener('click', fecharModalParte);
  // clique no fundo escuro fecha o modal
  modal.addEventListener('click', (e) => { if (e.target === modal) fecharModalParte(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharModalParte(); });

  document.getElementById('btnLimparLook').addEventListener('click', limparLookAtual);
}

/* ---------- salvar look (nome + categorias do look) ---------- */

function carregarCategoriasLook() {
  return fetch('/categorias_look')
    .then(res => res.json())
    .then(categorias => {
      categoriasLook = categorias || [];
      preencherFiltroLooks();
    })
    .catch(() => console.log('Erro ao carregar categorias de look'));
}

// Chips clicáveis de categoria de look dentro do modal de salvar
function renderizarChipsCategoriaLook(marcadas = []) {
  const chips = document.getElementById('chipsCategoriaLook');
  chips.innerHTML = categoriasLook.map(cat => `
    <label class="chipCategoriaLook">
      <input type="checkbox" value="${cat.id_categoria_look}"
             ${marcadas.includes(cat.id_categoria_look) ? 'checked' : ''}>
      <span>${escaparHtml(cat.nome)}</span>
    </label>
  `).join('');
}

// Ids das categorias de look que estão marcadas no modal
function categoriasLookMarcadas() {
  return [...document.querySelectorAll('#chipsCategoriaLook input:checked')].map(i => Number(i.value));
}

function abrirModalSalvarLook() {
  // não deixa abrir o modal sem nenhuma peça no look
  if (pecasDoLookAtual().length === 0) {
    const silhueta = document.querySelector('.silhuetaWrapper');
    silhueta.classList.remove('balancar');
    void silhueta.offsetWidth;   // reinicia a animação
    silhueta.classList.add('balancar');
    return;
  }
  document.getElementById('msgSalvarLook').hidden = true;
  renderizarChipsCategoriaLook(categoriasLookMarcadas());
  document.getElementById('modalSalvarLook').classList.add('aberto');
  document.getElementById('tituloLook').focus();
}

function fecharModalSalvarLook() {
  document.getElementById('modalSalvarLook').classList.remove('aberto');
}

async function salvarLook() {
  const msg = document.getElementById('msgSalvarLook');
  const btn = document.getElementById('btnConfirmarSalvarLook');
  const titulo = document.getElementById('tituloLook').value.trim();

  if (!titulo) {
    mostrarMensagem(msg, 'Dê um nome para o look.', 'erro');
    return;
  }

  btn.disabled = true;   // evita salvar duas vezes com clique duplo
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
    if (!res.ok) {
      mostrarMensagem(msg, dados.erro || 'Erro ao salvar o look.', 'erro');
      return;
    }

    // deu certo: fecha o modal, limpa a montagem e recarrega a galeria
    fecharModalSalvarLook();
    document.getElementById('tituloLook').value = '';
    renderizarChipsCategoriaLook([]);
    limparLookAtual();
    carregarDadosLooks(idClienteAtivo());
  } catch {
    mostrarMensagem(msg, 'Erro ao salvar o look.', 'erro');
  } finally {
    btn.disabled = false;
  }
}

// Cadastra uma categoria de look nova direto do modal e já deixa marcada
async function adicionarCategoriaLook() {
  const input = document.getElementById('inputNovaCategoriaLook');
  const msg = document.getElementById('msgSalvarLook');
  const nome = input.value.trim();
  if (!nome) return;

  try {
    const res = await fetch('/adicionar_categoria_look', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome })
    });
    const dados = await res.json();
    if (!res.ok) {
      mostrarMensagem(msg, dados.erro || 'Erro ao cadastrar categoria.', 'erro');
      return;
    }
    const marcadas = [...categoriasLookMarcadas(), dados.id_categoria_look];
    categoriasLook.push(dados);
    categoriasLook.sort((a, b) => a.nome.localeCompare(b.nome));
    renderizarChipsCategoriaLook(marcadas);
    preencherFiltroLooks();
    input.value = '';
    msg.hidden = true;
  } catch {
    mostrarMensagem(msg, 'Erro ao cadastrar categoria.', 'erro');
  }
}

function iniciarSalvarLook() {
  const modal = document.getElementById('modalSalvarLook');
  document.getElementById('btnSalvarLook').addEventListener('click', abrirModalSalvarLook);
  document.getElementById('fecharModalSalvarLook').addEventListener('click', fecharModalSalvarLook);
  document.getElementById('btnConfirmarSalvarLook').addEventListener('click', salvarLook);
  document.getElementById('btnNovaCategoriaLook').addEventListener('click', adicionarCategoriaLook);
  // Enter no campo de nova categoria cadastra; Enter no nome do look salva
  document.getElementById('inputNovaCategoriaLook').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); adicionarCategoriaLook(); }
  });
  document.getElementById('tituloLook').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); salvarLook(); }
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) fecharModalSalvarLook(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharModalSalvarLook(); });
}

/* ---------- galeria "Looks criados" ---------- */

// Opções do filtro de categoria em cima da galeria
function preencherFiltroLooks() {
  const filtro = document.getElementById('filtroLooks');
  const valorAtual = filtro.value;
  filtro.innerHTML = '<option value="">Todas as categorias</option>' +
    categoriasLook.map(cat => `<option value="${cat.id_categoria_look}">${escaparHtml(cat.nome)}</option>`).join('');
  filtro.value = valorAtual;
}

function renderizarGaleriaLooks() {
  const galeria = document.getElementById('galeriaLooks');
  const filtro = Number(document.getElementById('filtroLooks').value) || null;

  // se tiver filtro, mostra só os looks que têm aquela categoria
  const looks = filtro
    ? looksCliente.filter(look => look.categorias.some(c => c.id_categoria_look === filtro))
    : looksCliente;

  if (looks.length === 0) {
    galeria.innerHTML = `<p class="semPecas">${filtro ? 'Nenhum look nessa categoria.' : 'Nenhum look criado ainda.'}</p>`;
    return;
  }

  galeria.innerHTML = looks.map(look => `
    <article class="cardLook">
      <div class="fundoCardLook">
        ${montarBoneco(look.pecas)}
        <button class="btnExcluirPeca btnExcluirLook" type="button" data-id="${look.id_look}"
                aria-label="Excluir look ${escaparHtml(look.titulo)}">
          <svg viewBox="0 0 24 24">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/>
          </svg>
        </button>
      </div>
      <div class="infoCardLook">
        <span class="tituloCardLook">${escaparHtml(look.titulo)}</span>
        <span class="qtdPecasLook">${look.pecas.length} ${look.pecas.length === 1 ? 'peça' : 'peças'}</span>
        <div class="chipsCategoria">
          ${look.categorias.map(c => `<span class="chipCategoria">${escaparHtml(c.nome)}</span>`).join('')}
        </div>
      </div>
    </article>
  `).join('');

  // lixeira de cada look abre a confirmação
  galeria.querySelectorAll('.btnExcluirLook').forEach(btn => {
    btn.addEventListener('click', () => {
      idLookExcluir = btn.dataset.id;
      document.getElementById('modalConfirmacaoLook').classList.add('aberto');
    });
  });
}

function iniciarGaleriaLooks() {
  document.getElementById('filtroLooks').addEventListener('change', renderizarGaleriaLooks);

  // confirmação de exclusão do look (mesmo padrão da exclusão de peça)
  const modal = document.getElementById('modalConfirmacaoLook');
  const fechar = () => { modal.classList.remove('aberto'); idLookExcluir = null; };

  document.getElementById('btnNaoLook').addEventListener('click', fechar);
  modal.addEventListener('click', (e) => { if (e.target === modal) fechar(); });
  document.getElementById('btnSimLook').addEventListener('click', async () => {
    if (!idLookExcluir) return;
    const res = await fetch(`/excluir_look/${idLookExcluir}`, { method: 'POST' });
    fechar();
    if (res.ok) carregarDadosLooks(idClienteAtivo());
  });
}


// INIT
iniciarBalao();
trocarCliente();
iniciarOpcoesClientes();
iniciarModal();
iniciarAbas();
iniciarBalaoAdicionarPeca();
carregarCategorias();
iniciarModalPeca();
iniciarBalaoCategorias();   // balão de categorias de peça (aba Peças)
iniciarSilhueta();          // bolinhas da silhueta + modal de escolher peças
iniciarSalvarLook();        // modal de salvar look (nome + categorias)
iniciarGaleriaLooks();      // galeria de looks criados + exclusão
carregarCategoriasLook();   // categorias de look (Inverno, Festa...)