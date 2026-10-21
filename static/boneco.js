/* =====================================================================
   BONECO DO LOOK (compartilhado)
   ---------------------------------------------------------------------
   Usado na tela da consultora (gerenciamento.js) e na tela do cliente
   (looksCliente.js). Precisa ser carregado ANTES desses arquivos no HTML,
   porque eles usam PARTES_CORPO, escaparHtml e montarBoneco daqui.
   O visual fica em static/boneco.css.
   ===================================================================== */

// Nomes das partes do corpo. Os números são os mesmos da tabela parte_corpo
// do banco e do data-parte das bolinhas no HTML.
const PARTES_CORPO = { 1: 'Cabeça', 2: 'Tronco', 3: 'Cintura', 4: 'Pés', 5: 'Acessório' };

// Evita que nomes digitados pelo usuário (ex.: "<b>") virem HTML na tela
function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto == null ? '' : texto;
  return div.innerHTML;
}

/* ---------- desenho do "boneco" ----------
   Recebe uma lista de peças (cada uma com parte_corpo) e devolve o HTML
   do look montado: uma coluna central com cabeça > tronco > cintura > pés
   e uma coluna lateral com os acessórios. Peças da mesma parte ficam lado
   a lado, levemente sobrepostas, como numa foto de "flat lay".
   É usado no look em montagem, nos cards da galeria e no feed do cliente. */
function montarBoneco(pecas) {
  const porParte = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  pecas.forEach(peca => {
    // peça com categoria sem parte do corpo entra como acessório para não sumir
    const parte = porParte[peca.parte_corpo] ? peca.parte_corpo : 5;
    porParte[parte].push(peca);
  });

  const imagem = peca => `
    <img src="${peca.imagem || '/static/img/peca_padrao.png'}"
         alt="${escaparHtml(peca.titulo)}" title="${escaparHtml(peca.titulo)}" loading="lazy">`;

  // cada parte vira uma "faixa" do boneco; partes vazias não aparecem
  const faixa = (parte, classe) => porParte[parte].length
    ? `<div class="faixaBoneco ${classe}">${porParte[parte].map(imagem).join('')}</div>`
    : '';

  return `
    <div class="bonecoLook ${porParte[5].length ? 'comAcessorios' : ''}">
      <div class="corpoBoneco">
        ${faixa(1, 'faixaCabeca')}
        ${faixa(2, 'faixaTronco')}
        ${faixa(3, 'faixaCintura')}
        ${faixa(4, 'faixaPes')}
      </div>
      ${porParte[5].length ? `<div class="acessoriosBoneco">${porParte[5].map(imagem).join('')}</div>` : ''}
    </div>
  `;
}
