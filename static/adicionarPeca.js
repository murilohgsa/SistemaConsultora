const inputImagem = document.getElementById('imagemPeca');
const textoImagem = document.getElementById('textoImagem');
const botaoImagem = document.querySelector('.botaoImagem');
const iconeImagem = document.querySelector('.iconeImagem');
const form = document.getElementById('formAdicionarPecaCliente');
const botaoEnviar = document.querySelector('.botaoEnviar');

function iniciarSelecaoImagem() {
  if (!inputImagem || !textoImagem || !botaoImagem) return;

  inputImagem.addEventListener('change', () => {
    if (inputImagem.files.length > 0) {
      textoImagem.textContent = inputImagem.files[0].name;
      botaoImagem.classList.add('selecionada');

      const reader = new FileReader();
      reader.onload = (e) => {
        iconeImagem.innerHTML=`<img src="${e.target.result}"style="width:46px;height:46px;object-fit:cover;border-radius:6px;" alt="preview">`;
      };
      reader.readAsDataURL(arquivo);
    } else {
      textoImagem.textContent = 'Escolher imagem';
      botaoImagem.classList.remove('selecionada');
      iconeImagem.innerHTML = `<svg viewBox="0 0 24 24"> <rect x="3" y="3" width="18" height="18" rx="3"/> <circle cx="9" cy="9" r="1.6"/> <path d="M21 15l-5-5L5 21"/> </svg>`;
    }
  });
}

function iniciarValidacaoForm(){
  if (!form) return;
  form.addEventListener('submit', (e) => {
    const estacao = form.querySelector('input[name="estacao"]:checked'); 
    const ocasiao = form.querySelector('input[name="ocasiao"]:checked');
    const categoria = form.querySelector('select[name="id_categoria"]').value;
    const titulo = form.querySelector('input[name="titulo"]').value.trim();
    const imagem = inputImagem.files.length > 0;

    if (!titulo || !categoria || !estacao || !ocasiao || !imagem) {
      e.preventDefault();
      alert('Preencha todos os campos antes de enviar.');
      return;
    }

    botaoEnviar.style.opacity = '0.5';
    botaoEnviar.style.pointerEvents = 'none';
  });
}


iniciarSelecaoImagem();
iniciarValidacaoForm();