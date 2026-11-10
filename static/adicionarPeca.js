/* =====================================================================
   ADICIONAR PEÇA (tela da cliente)
   ---------------------------------------------------------------------
   [NOVO VISUAL] Reescrito junto com a nova tela (estilo "Criar nova
   publicação" do Instagram). Faz três coisas:
     1. mostra a PRÉVIA da foto escolhida dentro da área da foto
     2. permite ARRASTAR a foto do computador para a área da foto
     3. confere o formulário antes de enviar e trava o botão durante o envio
   ===================================================================== */

const inputImagem = document.getElementById('imagemPeca');
const areaFoto = document.getElementById('areaFoto');
const previaFoto = document.getElementById('previaFoto');
const textoAreaFoto = document.getElementById('textoAreaFoto');
const formPeca = document.getElementById('formAdicionarPecaCliente');
const botaoEnviar = document.querySelector('.botaoEnviar');
const msgPeca = document.getElementById('msgPeca');

// 1. prévia da foto (FileReader lê o arquivo e vira uma imagem na tela)
function mostrarPrevia() {
  const arquivo = inputImagem.files[0];
  if (!arquivo) {
    previaFoto.hidden = true;
    textoAreaFoto.hidden = false;
    return;
  }
  const leitor = new FileReader();
  leitor.onload = e => {
    previaFoto.src = e.target.result;
    previaFoto.hidden = false;
    textoAreaFoto.hidden = true;
  };
  leitor.readAsDataURL(arquivo);
}

// 2. arrastar a foto do computador para a área da foto
function iniciarArrastarFoto() {
  areaFoto.addEventListener('dragover', e => { e.preventDefault(); areaFoto.classList.add('sobre'); });
  areaFoto.addEventListener('dragleave', () => areaFoto.classList.remove('sobre'));
  areaFoto.addEventListener('drop', e => {
    e.preventDefault();
    areaFoto.classList.remove('sobre');
    if (e.dataTransfer.files.length) {
      inputImagem.files = e.dataTransfer.files;
      mostrarPrevia();
    }
  });
}

// 3. validação: mensagem na própria tela (antes era um alert())
function iniciarValidacao() {
  formPeca.addEventListener('submit', e => {
    const faltando = [];
    if (!inputImagem.files.length) faltando.push('a foto');
    if (!formPeca.titulo.value.trim()) faltando.push('o título');
    if (!formPeca.id_categoria.value) faltando.push('a categoria');
    if (!formPeca.querySelector('input[name="estacao"]:checked')) faltando.push('a estação');
    if (!formPeca.querySelector('input[name="ocasiao"]:checked')) faltando.push('a ocasião');

    if (faltando.length) {
      e.preventDefault();
      msgPeca.textContent = `Falta preencher: ${faltando.join(', ')}.`;
      msgPeca.hidden = false;
      return;
    }
    // trava o botão: o envio da foto pode demorar alguns segundos
    botaoEnviar.disabled = true;
    botaoEnviar.textContent = 'Enviando...';
  });
}

inputImagem.addEventListener('change', mostrarPrevia);
iniciarArrastarFoto();
iniciarValidacao();
