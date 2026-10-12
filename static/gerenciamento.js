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
    if (clienteAtivo) {
      window.location.href = `/adicionar_peca_cliente?id_cliente=${clienteAtivo.dataset.id}`;
    }
    balao.classList.contains('aberto') ? fecharBalaoAdicionarPeca() : abrirBalaoAdicionarPeca();
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
      categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id_categoria;
        option.textContent = cat.nome;
        select.appendChild(option);
      });
    })
    .catch(() => console.log('Erro ao carregar categorias'));
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