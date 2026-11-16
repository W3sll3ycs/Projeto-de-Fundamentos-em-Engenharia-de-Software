// Regras de negócio da US01 — Abrir ordem de serviço.
// Funções "puras": recebem o objeto db, então podem ser testadas em testes.html.

const STATUS_EM_ANDAMENTO = ['Aberta', 'Em execução'];

function validarOrdem(db, ordem) {
  const erros = [];
  const atendente = db.atendentes.find((a) => a.id_funcionario === ordem.id_atendente);
  const cliente = db.clientes.find((c) => c.id_cliente === ordem.id_cliente);
  const veiculo = db.automoveis.find((a) => a.id_automovel === ordem.id_automovel);

  if (!atendente) erros.push('Selecione um atendente válido (só atendentes abrem OS).');
  if (!cliente) erros.push('Selecione um cliente cadastrado.');

  if (!ordem.id_automovel) erros.push('Selecione o veículo que vai receber o atendimento.');
  else if (!veiculo) erros.push('Veículo não encontrado.');
  else if (cliente && veiculo.id_cliente !== cliente.id_cliente) erros.push('O veículo selecionado não pertence a esse cliente.');

  if (!Number.isInteger(ordem.km_entrada) || ordem.km_entrada < 0) {
    erros.push('Informe a quilometragem de entrada.');
  } else if (veiculo && ordem.km_entrada < veiculo.quilometragem) {
    erros.push(`A km de entrada não pode ser menor que a última registrada (${fmtKm(veiculo.quilometragem)}).`);
  }

  if (veiculo) {
    const aberta = db.ordens.find((o) => o.id_automovel === veiculo.id_automovel && STATUS_EM_ANDAMENTO.includes(o.status));
    if (aberta) erros.push(`Esse veículo já tem a OS nº ${aberta.id_os} em andamento.`);
  }

  if (!ordem.servicos || ordem.servicos.length === 0) erros.push('Selecione pelo menos um serviço.');
  else if (ordem.servicos.some((id) => !db.servicos.find((s) => s.id_servico === id))) erros.push('Há serviço inválido na seleção.');

  if (!ordem.mecanicos || ordem.mecanicos.length === 0) erros.push('Selecione pelo menos um mecânico responsável.');
  else if (ordem.mecanicos.some((id) => !db.mecanicos.find((m) => m.id_funcionario === id))) erros.push('Há mecânico inválido na seleção.');

  return erros;
}

// Valida e registra a OS. Retorna { ok: true, id_os } ou { ok: false, erros }.
function abrirOrdemServico(db, ordem, hoje = new Date()) {
  const erros = validarOrdem(db, ordem);
  if (erros.length > 0) return { ok: false, erros };

  const id_os = Math.max(0, ...db.ordens.map((o) => o.id_os)) + 1;
  const data = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  db.ordens.push({
    id_os,
    data_abertura: data,
    status: 'Aberta',
    data_conclusao: null,
    km_entrada: ordem.km_entrada,
    id_automovel: ordem.id_automovel,
    id_atendente: ordem.id_atendente,
    id_unidade: db.unidade.id_unidade,
    servicos: [...new Set(ordem.servicos)],   // Contém (N:N)
    mecanicos: [...new Set(ordem.mecanicos)], // Executa (N:N)
  });
  // atualiza a quilometragem do veículo
  db.automoveis.find((a) => a.id_automovel === ordem.id_automovel).quilometragem = ordem.km_entrada;
  return { ok: true, id_os };
}

function valorEstimado(db, os) {
  return os.servicos.reduce((total, id) => total + db.servicos.find((s) => s.id_servico === id).valor, 0);
}

function detalharOrdem(db, id_os) {
  const os = db.ordens.find((o) => o.id_os === id_os);
  if (!os) return null;
  const veiculo = db.automoveis.find((a) => a.id_automovel === os.id_automovel);
  return {
    os,
    veiculo,
    cliente: db.clientes.find((c) => c.id_cliente === veiculo.id_cliente),
    atendente: db.atendentes.find((a) => a.id_funcionario === os.id_atendente),
    servicos: os.servicos.map((id) => {
      const s = db.servicos.find((x) => x.id_servico === id);
      return { ...s, setor: db.setores.find((st) => st.id_setor === s.id_setor).nome };
    }),
    mecanicos: os.mecanicos.map((id) => db.mecanicos.find((m) => m.id_funcionario === id)),
    total: valorEstimado(db, os),
  };
}

function listarEmAndamento(db) {
  return db.ordens
    .filter((o) => STATUS_EM_ANDAMENTO.includes(o.status))
    .sort((a, b) => b.id_os - a.id_os)
    .map((o) => detalharOrdem(db, o.id_os));
}
