// Tela "Cadastrar cliente e veículos" (US04)
montarLayout('cliente');
const db = carregar();
const $ = (id) => document.getElementById(id);

// Cada veículo é uma linha do formulário; a lista pode crescer ou diminuir.
function novaLinhaVeiculo() {
  const linha = document.createElement('div');
  linha.className = 'veiculo-linha';
  linha.innerHTML = `
    <div class="topo-linha"><span class="titulo-veiculo"></span>
      <button type="button" class="botao perigo remover">Remover</button></div>
    <div class="grade">
      <label>Placa <input type="text" data-campo="placa" placeholder="ABC-1D23" maxlength="8" autocomplete="off"></label>
      <label>Marca <input type="text" data-campo="marca" autocomplete="off"></label>
      <label>Modelo <input type="text" data-campo="modelo" autocomplete="off"></label>
      <label>Ano (opcional) <input type="number" data-campo="ano" min="1900" step="1"></label>
      <label>Quilometragem atual <input type="number" data-campo="km" min="0" step="1"></label>
    </div>`;
  linha.querySelector('.remover').addEventListener('click', () => { linha.remove(); renumerar(); });
  $('veiculos').appendChild(linha);
  renumerar();
}

function renumerar() {
  const linhas = [...document.querySelectorAll('.veiculo-linha')];
  linhas.forEach((l, i) => {
    l.querySelector('.titulo-veiculo').textContent = `Veículo ${i + 1}`;
    l.querySelector('.remover').hidden = linhas.length === 1; // sempre sobra pelo menos um
  });
}

const numeroOuNulo = (texto) => (texto.trim() === '' ? null : Number(texto));

function lerVeiculos() {
  return [...document.querySelectorAll('.veiculo-linha')].map((l) => {
    const c = (campo) => l.querySelector(`[data-campo=${campo}]`).value;
    return { placa: c('placa'), marca: c('marca'), modelo: c('modelo'), ano: numeroOuNulo(c('ano')), quilometragem: numeroOuNulo(c('km')) };
  });
}

$('add-veiculo').addEventListener('click', novaLinhaVeiculo);
novaLinhaVeiculo();

$('form-cliente').addEventListener('submit', (e) => {
  e.preventDefault();
  const resultado = cadastrarCliente(db, {
    nome: $('nome').value, cpf: $('cpf').value, telefone: $('telefone').value, veiculos: lerVeiculos(),
  });
  if (!resultado.ok) {
    $('erros').innerHTML = `<div class="alerta erro"><b>Não foi possível cadastrar o cliente:</b>
      <ul>${resultado.erros.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  salvar(db);
  avisar('Cliente cadastrado com sucesso. Já dá para abrir uma OS para ele.');
  location.href = `nova-os.html?cliente=${resultado.id_cliente}`;
});
