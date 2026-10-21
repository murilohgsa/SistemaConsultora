/* =====================================================================
   NOTIFICAÇÕES DO CLIENTE (sininho)
   ---------------------------------------------------------------------
   Usado nas telas do cliente: feed, perfil e adicionar peça.
   Fluxo:
   1. Ao abrir a página, busca /notificacoes e mostra o número de não lidas
      no sininho. Se tiver look novo, aparece também um aviso no canto da tela.
   2. A cada 60 segundos busca de novo, para o aviso chegar sem recarregar.
   3. Clicar no sininho abre a lista e marca tudo como lido (/notificacoes/lidas).
   A notificação é criada pela rota /salvar_look quando a consultora
   salva um look para este cliente.
   ===================================================================== */

const btnNotificacoes = document.getElementById('btnNotificacoes');
const painelNotificacoes = document.getElementById('painelNotificacoes');
const listaNotificacoes = document.getElementById('listaNotificacoes');
const contadorNotificacoes = document.getElementById('contadorNotificacoes');
const avisoNovoLook = document.getElementById('avisoNovoLook');

var naoLidas = 0;                 // quantas notificações ainda não foram vistas
var timerAviso = null;            // controla o sumiço automático do aviso
const INTERVALO_BUSCA = 60000;    // 60 segundos

// Evita que textos vindos do banco (ex.: nome do look) virem HTML na tela
function escaparTexto(texto) {
  const div = document.createElement('div');
  div.textContent = texto == null ? '' : texto;
  return div.innerHTML;
}

// "agora", "há 5 min", "há 2 h", "ontem" ou a data (20/10)
function tempoRelativo(dataIso) {
  const minutos = Math.floor((Date.now() - new Date(dataIso).getTime()) / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  if (horas < 48) return 'ontem';
  return new Date(dataIso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// Atualiza o número vermelho em cima do sininho
function atualizarContador() {
  contadorNotificacoes.textContent = naoLidas > 9 ? '9+' : naoLidas;
  contadorNotificacoes.hidden = naoLidas === 0;
  btnNotificacoes.setAttribute('aria-label',
    naoLidas ? `Notificações, ${naoLidas} ${naoLidas === 1 ? 'nova' : 'novas'}` : 'Notificações');
}

// Monta a lista dentro do painel do sininho
function renderizarNotificacoes(notificacoes) {
  if (notificacoes.length === 0) {
    listaNotificacoes.innerHTML = '<li class="semNotificacoes">Nenhuma notificação por enquanto.</li>';
    return;
  }

  listaNotificacoes.innerHTML = notificacoes.map(notif => {
    // mostra até 4 fotos das peças do look; o resto vira "+N"
    const fotos = notif.imagens.slice(0, 4);
    const sobra = notif.imagens.length - fotos.length;
    // cada notificação é um link para o look no feed (/feed?look=ID)
    return `
      <li>
        <a class="itemNotificacao ${notif.lida ? '' : 'naoLida'}"
           href="/feed?look=${notif.id_look}" data-look="${notif.id_look}">
          <span class="fotosNotificacao" aria-hidden="true">
            ${fotos.map(src => `<img src="${escaparTexto(src)}" alt="" loading="lazy">`).join('')}
            ${sobra > 0 ? `<span class="maisFotos">+${sobra}</span>` : ''}
          </span>
          <span class="textoNotificacao">
            <span class="mensagemNotificacao">${escaparTexto(notif.mensagem)}</span>
            ${notif.categorias.length ? `
              <span class="tagsNotificacao">
                ${notif.categorias.map(c => `<span>${escaparTexto(c)}</span>`).join('')}
              </span>` : ''}
            <time datetime="${escaparTexto(notif.data)}">${tempoRelativo(notif.data)}</time>
          </span>
        </a>
      </li>
    `;
  }).join('');

  // No feed, abre o look ali mesmo (sem recarregar a página).
  // Nas outras telas o link leva para /feed?look=ID, que abre o look ao carregar.
  listaNotificacoes.querySelectorAll('.itemNotificacao').forEach(link => {
    link.addEventListener('click', (e) => {
      if (typeof window.abrirLookCliente !== 'function') return;
      e.preventDefault();
      fecharPainelNotificacoes();
      window.abrirLookCliente(Number(link.dataset.look));
    });
  });
}

// Mostra o aviso no canto da tela por alguns segundos
function mostrarAvisoNovoLook(notif) {
  avisoNovoLook.innerHTML = `
    <strong>Novo look para você!</strong>
    <span>${escaparTexto(notif.titulo_look || notif.mensagem)}</span>
  `;
  avisoNovoLook.hidden = false;
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => { avisoNovoLook.hidden = true; }, 6000);
}

// Busca as notificações no Flask
function carregarNotificacoes() {
  fetch('/notificacoes')
    .then(res => res.json())
    .then(dados => {
      const notificacoes = dados.notificacoes || [];
      naoLidas = dados.nao_lidas || 0;
      atualizarContador();
      renderizarNotificacoes(notificacoes);

      // Aviso no canto só para notificação nova que ainda não foi avisada.
      // Guardamos o id da última avisada no navegador (sessionStorage) para
      // não repetir o aviso a cada página ou a cada busca de 60s.
      const maisNova = notificacoes.find(n => !n.lida);
      if (!maisNova) return;
      let ultimaAvisada = null;
      try { ultimaAvisada = sessionStorage.getItem('ultimaNotificacaoAvisada'); } catch {}
      if (String(maisNova.id_notificacao) !== ultimaAvisada) {
        mostrarAvisoNovoLook(maisNova);
        try { sessionStorage.setItem('ultimaNotificacaoAvisada', maisNova.id_notificacao); } catch {}
      }
    })
    .catch(() => console.log('Erro ao carregar notificações'));
}

function abrirPainelNotificacoes() {
  painelNotificacoes.classList.add('aberto');
  btnNotificacoes.setAttribute('aria-expanded', 'true');
  avisoNovoLook.hidden = true;

  // abriu o sininho = viu as notificações: marca como lidas no banco
  if (naoLidas > 0) {
    fetch('/notificacoes/lidas', { method: 'POST' })
      .then(res => {
        if (!res.ok) return;
        naoLidas = 0;
        atualizarContador();
      })
      .catch(() => console.log('Erro ao marcar notificações como lidas'));
  }
}

function fecharPainelNotificacoes() {
  if (!painelNotificacoes.classList.contains('aberto')) return;
  painelNotificacoes.classList.remove('aberto');
  btnNotificacoes.setAttribute('aria-expanded', 'false');
  // tira o destaque de "não lida" dos itens que acabaram de ser vistos
  listaNotificacoes.querySelectorAll('.naoLida').forEach(item => item.classList.remove('naoLida'));
}

function iniciarNotificacoes() {
  if (!btnNotificacoes || !painelNotificacoes) return;

  btnNotificacoes.addEventListener('click', (e) => {
    e.stopPropagation();
    painelNotificacoes.classList.contains('aberto') ? fecharPainelNotificacoes() : abrirPainelNotificacoes();
  });

  // clicar no aviso do canto abre o sininho
  avisoNovoLook.addEventListener('click', (e) => {
    e.stopPropagation();
    abrirPainelNotificacoes();
  });
  avisoNovoLook.setAttribute('tabindex', '0');

  // clique dentro do painel não fecha; clique fora ou ESC fecha
  painelNotificacoes.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', fecharPainelNotificacoes);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharPainelNotificacoes();
  });

  carregarNotificacoes();
  setInterval(carregarNotificacoes, INTERVALO_BUSCA);
}

iniciarNotificacoes();
