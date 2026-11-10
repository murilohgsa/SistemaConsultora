/* =====================================================================
   BONECO / MANEQUIM DO LOOK (compartilhado)
   ---------------------------------------------------------------------
   Usado na tela da consultora (gerenciamento.js) e na tela do cliente
   (looksCliente.js). Precisa ser carregado ANTES desses arquivos no HTML,
   porque eles usam PARTES_CORPO, escaparHtml, montarBoneco e montarManequim.
   O visual fica em static/boneco.css.

   [NOVO] O que mudou nesta versão:
     - montarManequim(): desenha um manequim elegante em SVG (estilo
       "dress form" de ateliê) com 5 ÁREAS DE SOLTAR, uma para cada parte
       do corpo. As peças escolhidas aparecem POR CIMA do corpo, no lugar
       certo (boné na cabeça, camisa no tronco, calça nas pernas...).
       O arrastar e soltar em si é ligado no gerenciamento.js.
     - montarBoneco(): desenha a miniatura do look como uma COLAGEM
       organizada (grade de cartões), usada no feed, grades e detalhes.
     - Os nomes das partes ficaram mais "de moda": Parte de cima, Parte de
       baixo, Calçados... (os NÚMEROS 1 a 5 continuam iguais aos do banco).
   ===================================================================== */

// Nomes das partes do corpo. Os números são os mesmos da tabela parte_corpo
// do banco (1 cabeça, 2 tronco, 3 cintura, 4 pés, 5 acessório).
// [NOVO] só o TEXTO mostrado na tela mudou, para ficar mais claro para a consultora.
const PARTES_CORPO = {
  1: 'Cabeça',
  2: 'Parte de cima',
  3: 'Parte de baixo',
  4: 'Calçados',
  5: 'Acessórios'
};

// [NOVO] Ícones (SVG em linha) de cada parte do corpo, usados nos chips de filtro,
// nas áreas vazias do manequim e no resumo do look.
const ICONES_PARTES = {
  1: '<svg viewBox="0 0 24 24"><path d="M4 15c0-4.4 3.6-8 8-8s8 3.6 8 8"/><path d="M2 15h20"/><path d="M12 7V5"/></svg>',
  2: '<svg viewBox="0 0 24 24"><path d="M8 3 4 6l2 4 2-1v12h8V9l2 1 2-4-4-3c-.5 1.7-2 3-4 3S8.5 4.7 8 3Z"/></svg>',
  3: '<svg viewBox="0 0 24 24"><path d="M6 3h12l1 18h-5l-2-11-2 11H5Z"/></svg>',
  4: '<svg viewBox="0 0 24 24"><path d="M3 16c0-2 1-3 3-3l4-1 3-5 2 1-1 4c3 0 7 1 7 4v2H3Z"/><path d="M3 18h18"/></svg>',
  5: '<svg viewBox="0 0 24 24"><path d="M6 9h12l-1 11H7Z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/></svg>'
};

// [REVISÃO] Antes, peça sem foto apontava para /static/img/peca_padrao.png, arquivo
// que não existe no projeto (dava erro 404 e imagem quebrada). Agora usamos um
// desenho de cabide embutido (SVG em "data URI"), que nunca falha.
const IMAGEM_PADRAO = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#F4EFE8"/>' +
  '<path d="M50 30a6 6 0 1 1 6 6c-3 0-6 2-6 5v3l30 18c3 2 2 6-2 6H22c-4 0-5-4-2-6l30-18" fill="none" stroke="#B9A792" stroke-width="3" stroke-linecap="round"/></svg>'
);

// Evita que nomes digitados pelo usuário (ex.: "<b>") virem HTML na tela
function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto == null ? '' : texto;
  return div.innerHTML;
}

// Separa uma lista de peças por parte do corpo: { 1: [...], 2: [...], ... }
// Peça com categoria sem parte do corpo entra como acessório para não sumir.
function separarPorParte(pecas) {
  const porParte = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  pecas.forEach(peca => {
    const parte = porParte[peca.parte_corpo] ? peca.parte_corpo : 5;
    porParte[parte].push(peca);
  });
  return porParte;
}

/* ---------- miniatura do look (COLAGEM) ----------
   [NOVO VISUAL] Antes as fotos ficavam pequenas e "soltas" num boneco
   (cabeça > tronco > pernas > pés, acessórios ao lado). Agora o look é uma
   COLAGEM organizada, como um moodboard / post em carrossel do Instagram:
     - as peças viram cartões de cantos arredondados numa grade quadrada;
     - a PEÇA PRINCIPAL (parte de cima, ex.: camisa ou vestido) fica no
       cartão maior; depois vêm parte de baixo, calçados, cabeça e acessórios;
     - o desenho da grade muda conforme a quantidade de peças (1 a 9), sempre
       preenchendo o quadrado sem sobrar espaço (classes qtd1 ... qtd9 no
       boneco.css). Com mais de 9 peças, o último cartão mostra "+N".
   O nome continua montarBoneco para não precisar mudar quem já usa
   (feed da cliente, grades de looks, detalhe do look, stories). */
const ORDEM_COLAGEM = [2, 3, 4, 1, 5];   // parte de cima primeiro, acessórios por último
const MAXIMO_COLAGEM = 9;

function montarBoneco(pecas) {
  const porParte = separarPorParte(pecas || []);
  const ordenadas = ORDEM_COLAGEM.flatMap(parte => porParte[parte]);

  if (ordenadas.length === 0) {
    return '<div class="colagemLook qtd1"><figure class="cartaoColagem vazio"><img src="' + IMAGEM_PADRAO + '" alt=""></figure></div>';
  }

  // com mais de 9 peças: mostra 8 e o nono cartão vira "+N"
  const sobra = ordenadas.length > MAXIMO_COLAGEM ? ordenadas.length - (MAXIMO_COLAGEM - 1) : 0;
  const visiveis = sobra ? ordenadas.slice(0, MAXIMO_COLAGEM - 1) : ordenadas;
  const qtd = sobra ? MAXIMO_COLAGEM : visiveis.length;

  const cartoes = visiveis.map(peca => `
    <figure class="cartaoColagem">
      <img src="${peca.imagem || IMAGEM_PADRAO}" alt="${escaparHtml(peca.titulo)}" title="${escaparHtml(peca.titulo)}" loading="lazy">
    </figure>`).join('');

  return `
    <div class="colagemLook qtd${qtd}">
      ${cartoes}
      ${sobra ? `<figure class="cartaoColagem maisPecas"><span>+${sobra}</span></figure>` : ''}
    </div>`;
}

/* ---------- manequim interativo (aba "Montar looks") ----------
   [NOVO] Devolve o HTML do manequim com as áreas de soltar.
   Cada área tem data-parte (1 a 5) — é isso que o gerenciamento.js lê no
   evento "drop" para saber onde a peça foi solta.

   Como as peças ficam POR CIMA do corpo:
     O manequim é um SVG desenhado num "quadro" de 200 x 460.
     Cada área (.zonaManequim) é posicionada em PORCENTAGEM sobre esse quadro
     (ex.: a parte de cima ocupa de 17% a 44% da altura), então tudo
     acompanha o tamanho da tela sem distorcer.
     A foto da peça usa object-fit: contain, aparecendo inteira na área.

   Parâmetro:
     pecas -> lista das peças do look em montagem (com parte_corpo) */
function montarManequim(pecas) {
  const porParte = separarPorParte(pecas);

  // peças dentro de uma área: cada uma é arrastável (para tirar do corpo)
  // e tem um botão X para remover
  const pecasNaZona = parte => porParte[parte].map((peca, i) => `
    <figure class="pecaVestida" draggable="true" data-id="${peca.id_peca}" data-origem="manequim"
            style="--ordem:${i}" title="${escaparHtml(peca.titulo)}">
      <img src="${peca.imagem || IMAGEM_PADRAO}" alt="${escaparHtml(peca.titulo)}" draggable="false">
      <button class="removerPecaVestida" type="button" data-id="${peca.id_peca}"
              aria-label="Tirar ${escaparHtml(peca.titulo)} do manequim">
        <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </figure>`).join('');

  // área de soltar de uma parte do corpo
  const zona = (parte, classe) => `
    <div class="zonaManequim ${classe} ${porParte[parte].length ? 'ocupada' : ''}"
         data-parte="${parte}" data-qtd="${porParte[parte].length}"
         role="group" aria-label="${PARTES_CORPO[parte]}: ${porParte[parte].length} peça(s)">
      <span class="rotuloZona">${ICONES_PARTES[parte]}<span>${PARTES_CORPO[parte]}</span></span>
      <div class="pecasZona">${pecasNaZona(parte)}</div>
    </div>`;

  return `
    <div class="manequim" id="manequim">
      <!-- brilho de "holofote" atrás do manequim -->
      <div class="holofote" aria-hidden="true"></div>

      <svg class="corpoManequim" viewBox="0 0 200 460" aria-hidden="true">
        <defs>
          <!-- degradê bege claro -> bege escuro (cores originais): dá volume ao corpo -->
          <linearGradient id="peleManequim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#B9A792"/>
            <stop offset=".45" stop-color="#EDE2D4"/>
            <stop offset="1" stop-color="#A8957F"/>
          </linearGradient>
          <linearGradient id="hasteManequim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#a68a6e"/>
            <stop offset="1" stop-color="#7d6650"/>
          </linearGradient>
          <radialGradient id="sombraChao" cx=".5" cy=".5" r=".5">
            <stop offset="0" stop-color="#111" stop-opacity=".18"/>
            <stop offset="1" stop-color="#000" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- sombra no chão -->
        <ellipse cx="100" cy="448" rx="70" ry="9" fill="url(#sombraChao)"/>

        <g fill="url(#peleManequim)" stroke="rgba(166,138,110,.45)" stroke-width=".8">
          <!-- cabeça e pescoço -->
          <ellipse cx="100" cy="36" rx="20" ry="25"/>
          <path d="M92 58 C92 66 91 72 88 78 L112 78 C109 72 108 66 108 58 Z"/>
          <!-- braços -->
          <path d="M54 92 C42 98 38 118 37 146 C36 176 35 204 32 232 C31 242 39 245 42 236 C46 208 49 182 53 156 C55 138 59 124 62 116 Z"/>
          <path d="M146 92 C158 98 162 118 163 146 C164 176 165 204 168 232 C169 242 161 245 158 236 C154 208 151 182 147 156 C145 138 141 124 138 116 Z"/>
          <!-- pernas -->
          <path d="M68 222 C66 276 71 326 75 366 C77 392 77 412 79 428 L96 428 C96 410 97 390 98 366 C99 326 99 278 100 238 Z"/>
          <path d="M132 222 C134 276 129 326 125 366 C123 392 123 412 121 428 L104 428 C104 410 103 390 102 366 C101 326 101 278 100 238 Z"/>
          <!-- pés -->
          <ellipse cx="87" cy="434" rx="13" ry="6"/>
          <ellipse cx="113" cy="434" rx="13" ry="6"/>
          <!-- tronco: ombros, cintura marcada e quadril (silhueta de ateliê) -->
          <path d="M100 78 C80 78 62 82 52 90 C44 96 44 108 48 120 C54 138 66 160 71 188 C69 202 64 212 64 226 C76 236 124 236 136 226 C136 212 131 202 129 188 C134 160 146 138 152 120 C156 108 156 96 148 90 C138 82 120 78 100 78 Z"/>
        </g>
        <!-- costura central e linha da cintura: detalhe de manequim de costura -->
        <path d="M100 82 V 228" stroke="rgba(166,138,110,.35)" stroke-width=".8" stroke-dasharray="3 3" fill="none"/>
        <path d="M72 188 C88 194 112 194 128 188" stroke="rgba(166,138,110,.5)" stroke-width="1" fill="none"/>
      </svg>

      ${zona(1, 'zonaCabeca')}
      ${zona(2, 'zonaTronco')}
      ${zona(3, 'zonaPernas')}
      ${zona(4, 'zonaPes')}
    </div>

    <!-- acessórios ficam numa "bandeja" ao lado do manequim -->
    ${zona(5, 'zonaAcessorios')}
  `;
}
