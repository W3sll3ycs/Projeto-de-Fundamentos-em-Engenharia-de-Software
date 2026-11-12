// Tela "Abrir ordem de serviço" (US01)
montarLayout('nova');
const db = carregar();

const $ = (id) => document.getElementById(id);
const opcao = (valor, texto) => `<option value="${valor}">${esc(texto)}</option>`;

// Preenche os campos com os dados cadastrados
$('atendente').innerHTML = opcao('', 'Selecione…') +
  db.atendentes.map((a) => opcao(a.id_funcionario, `${a.nome} (${a.turno})`)).join('');
$('cliente').innerHTML = opcao('', 'Selecione…') +
  db.clientes.map((c) => opcao(c.id_cliente, `${c.nome} — CPF ${c.cpf}`)).join('');

const nomeSetor = (id) => db.setores.find((s) => s.id_setor === id).nome;
$('servicos').innerHTML = db.servicos.map((s) => `
  <label class="opcao">
    <input type="checkbox" name="servicos" value="${s.id_servico}" data-valor="${s.valor}">
    <span><b>${esc(s.descricao)}</b><small>${esc(nomeSetor(s.id_setor))} · ${fmtMoeda(s.valor)}</small></span>
  </label>`).join('');
$('mecanicos').innerHTML = db.mecanicos.map((m) => `
  <label class="opcao">
    <input type="checkbox" name="mecanicos" value="${m.id_funcionario}">
    <span><b>${esc(m.nome)}</b><small>${esc(m.especialidade)}</small></span>
  </label>`).join('');

// O select de veículos mostra só os veículos do cliente escolhido
function atualizarVeiculos() {
  const idCliente = Number($('cliente').value);
  const veiculos = db.automoveis.filter((a) => a.id_cliente === idCliente);
  $('veiculo').innerHTML = opcao('', idCliente ? 'Selecione…' : 'Selecione o cliente primeiro…') +
    veiculos.map((a) => opcao(a.id_automovel, `${a.placa} — ${a.marca} ${a.modelo}`)).join('');
  atualizarDicaKm();
}

function atualizarDicaKm() {
  const v = db.automoveis.find((a) => a.id_automovel === Number($('veiculo').value));
  $('km-dica').textContent = v ? `Última km registrada: ${fmtKm(v.quilometragem)}` : '';
}

function atualizarTotal() {
  let total = 0;
  document.querySelectorAll('input[name=servicos]:checked').forEach((c) => { total += Number(c.dataset.valor); });
  $('total').textContent = fmtMoeda(total);
}

const marcados = (nome) =>
  [...document.querySelectorAll(`input[name=${nome}]:checked`)].map((c) => Number(c.value));

$('cliente').addEventListener('change', atualizarVeiculos);
$('veiculo').addEventListener('change', atualizarDicaKm);
document.querySelectorAll('input[name=servicos]').forEach((c) => c.addEventListener('change', atualizarTotal));
atualizarVeiculos();

$('form-os').addEventListener('submit', (e) => {
  e.preventDefault();
  const kmTexto = $('km').value.trim();
  const ordem = {
    id_atendente: Number($('atendente').value) || null,
    id_cliente: Number($('cliente').value) || null,
    id_automovel: Number($('veiculo').value) || null,
    km_entrada: kmTexto === '' ? null : Number(kmTexto),
    servicos: marcados('servicos'),
    mecanicos: marcados('mecanicos'),
  };

  const resultado = abrirOrdemServico(db, ordem);
  if (!resultado.ok) {
    $('erros').innerHTML = `<div class="alerta erro"><b>Não foi possível abrir a OS:</b>
      <ul>${resultado.erros.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  salvar(db);
  avisar(`Ordem de serviço nº ${resultado.id_os} aberta com sucesso.`);
  location.href = `os.html?id=${resultado.id_os}`;
});
