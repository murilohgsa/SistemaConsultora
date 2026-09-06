const balao     = document.getElementById('balaoLogin');
const inputEmail = document.getElementById('email');
const inputSenha = document.getElementById('senha');
const btnAbrirLogin = document.getElementById('btnAbrirLogin')
const msgErro    = document.getElementById('msgErro');
const btnCadastrar  = document.getElementById('btnCadastrar');
const itensCliente = document.querySelectorAll('.itemCliente');
const nomeClienteAtivo = document.getElementById('nomeClienteAtivo');
const fotoClienteAtivo = document.querySelector('.cabecalhoCliente img');


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

iniciarBalao();