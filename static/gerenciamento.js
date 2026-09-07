const balao = document.getElementById('balaoLogin');
const inputEmail = document.getElementById('email');
const inputSenha = document.getElementById('senha');
const btnAbrirLogin = document.getElementById('btnAbrirLogin')
const msgErro = document.getElementById('msgErro');
const btnCadastrar  = document.getElementById('btnCadastrar');
const itensCliente = document.querySelectorAll('.itemCliente');
const nomeClienteAtivo = document.getElementById('nomeClienteAtivo');
const fotoClienteAtivo = document.querySelector('.cabecalhoCliente img');
const modal = document.getElementById('modalConfirmacao');
const btnSim = document.getElementById('btnSim');
const btnNao = document.getElementById('btnNao');

var idClienteExcluir = null;


function abrirBalao(){
  balao.classList.add('aberto');
  btnAbrirLogin.setAttribute('aria-expanded', true);
}
function fecharBalao(){
  balao.classList.remove('aberto');
  btnAbrirLogin.setAttribute('aria-expanded', false);

  const msgRetorno = balao.querySelector('.msgRetorno');
  if (msgRetorno) msgRetorno.remove();

  balao.querySelectorAll('input[type="email"], input[type=password], input[type="text"]')
    .forEach(input => input.value = '');
}
function iniciarBalao(){
  // abrir/fechar

  const temMensagem = balao.querySelector('.msgRetorno');
  if(temMensagem){
    abrirBalao();
  }
  btnAbrirLogin.addEventListener('click', (e) =>{
    e.stopPropagation();
    balao.classList.contains('aberto') ? fecharBalao() : abrirBalao();
  });

  balao.addEventListener('click', (e) =>{
    e.stopPropagation();
  });

  document.addEventListener('click', (e) => {
    if (!balao.contains(e.target) && e.target !== btnAbrirLogin){
      fecharBalao();
    }
  });

  document.addEventListener('keydown', (e) =>{
    if(e.key === 'Escape'){
      fecharBalao();
    }
  });

  inputSenha.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btnCadastrar.click();
    }
  });
}

function ativarCliente(btn){
  itensCliente.forEach(b=> b.removeAttribute('aria-current'));
  btn.setAttribute('aria-current', 'true');
  
  nomeClienteAtivo.textContent = btn.dataset.nome;
  fotoClienteAtivo.src = btn.dataset.foto;
  fotoClienteAtivo.alt = btn.dataset.nome;

}

function trocarCliente(){
  itensCliente.forEach(btn =>{
    btn.addEventListener('click', () => ativarCliente(btn));
  });

  if(itensCliente.length > 0) {
    ativarCliente(itensCliente[0]);
  }
}


function iniciarOpcoesClientes(){
  document.querySelectorAll('.linhaCliente').forEach(item => {
    const btnOpcoes = item.querySelector('.btnOpcoes');
    const menuOpcoes = item.querySelector('.menuOpcoes');
    const btnExcluir = item.querySelector('.opcaoExcluir');

    btnOpcoes.addEventListener('click', (e) =>{
        e.stopPropagation();
        document.querySelectorAll('.menuOpcoes.aberto').forEach(m=> {
          if(m!==menuOpcoes){
            m.classList.remove('aberto');
          }
        });
        const rect = btnOpcoes.getBoundingClientRect();
        menuOpcoes.style.top = rect.bottom + 4 + 'px';
        menuOpcoes.style.right = window.innerWidth - rect.right + 'px';
        menuOpcoes.style.left = 'auto';
        menuOpcoes.classList.toggle('aberto');
      });

    menuOpcoes.addEventListener('click', (e) =>{
      e.stopPropagation()
    });

    btnExcluir.addEventListener('click', (e) =>{
      e.stopPropagation();
      idClienteExcluir = btnExcluir.dataset.id;
      const nome = btnExcluir.dataset.nome;
      document.getElementById('textoConfirmacao').textContent = `Deseja realmente excluir o cliente "${nome}"?`;
      modal.classList.add('aberto');
      menuOpcoes.classList.remove('aberto');
    });
  });


  //fechar o menu ao dar um click fora dele
  document.addEventListener('click', () =>{
    document.querySelectorAll('.menuOpcoes.aberto')
    .forEach(m => m.classList.remove('aberto'));
  });
}


function iniciarModal(){
  btnNao.addEventListener('click', () => {
    modal.classList.remove('aberto');
    idClienteExcluir = null;
  });

  btnSim.addEventListener('click', async () => {
    if(!idClienteExcluir){
      return;
    }
    const res = await fetch (`/excluir_cliente/${idClienteExcluir}`, {
      method: 'POST'
    });

    if (res.ok){
      window.location.reload();
    } else {
      alert('Erro ao excluir cliente.');
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

iniciarBalao();
trocarCliente();
iniciarOpcoesClientes();
iniciarModal();
