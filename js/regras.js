// Regras de negócio da US01 — Abrir ordem de serviço.
// Funções "puras": recebem o objeto db, então podem ser testadas em testes.html.

const STATUS_EM_ANDAMENTO = ['Aberta', 'Em execução'];

// Data local (AAAA-MM-DD) de um objeto Date
const dataISO = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

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
  const data = dataISO(hoje);

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

// ---------------------------------------------------------------------------
// US04 — Cadastrar cliente e veículos
// ---------------------------------------------------------------------------

const soDigitos = (t) => String(t ?? '').replace(/\D/g, '');

function formatarCpf(t) {
  const d = soDigitos(t);
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : String(t ?? '').trim();
}

function formatarTelefone(t) {
  const d = soDigitos(t);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return String(t ?? '').trim();
}

// Aceita placa antiga (ABC-1234) e Mercosul (ABC-1D23), com ou sem hífen, em qualquer caixa
function normalizarPlaca(t) {
  const p = String(t ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return p.length === 7 ? `${p.slice(0, 3)}-${p.slice(3)}` : String(t ?? '').trim().toUpperCase();
}
const PLACA_VALIDA = /^[A-Z]{3}-[0-9][A-Z0-9][0-9]{2}$/;

function validarCliente(db, dados, hoje = new Date()) {
  const erros = [];
  const nome = String(dados.nome ?? '').trim();
  const cpf = formatarCpf(dados.cpf);
  const tel = soDigitos(dados.telefone);

  if (nome.length < 3) erros.push('Informe o nome do cliente (mínimo 3 letras).');

  if (soDigitos(dados.cpf).length !== 11) erros.push('Informe um CPF com 11 dígitos.');
  else if (db.clientes.some((c) => c.cpf === cpf)) erros.push(`Já existe um cliente cadastrado com o CPF ${cpf}.`);

  if (tel.length < 10 || tel.length > 11) erros.push('Informe um telefone com DDD (10 ou 11 dígitos).');

  const veiculos = dados.veiculos || [];
  if (veiculos.length === 0) erros.push('Cadastre pelo menos um veículo para o cliente.');

  const vistas = new Set();
  veiculos.forEach((v, i) => {
    const rotulo = `Veículo ${i + 1}`;
    const placa = normalizarPlaca(v.placa);
    if (!PLACA_VALIDA.test(placa)) erros.push(`${rotulo}: placa inválida (use o formato ABC-1D23 ou ABC-1234).`);
    else if (vistas.has(placa)) erros.push(`${rotulo}: a placa ${placa} está repetida neste cadastro.`);
    else if (db.automoveis.some((a) => a.placa === placa)) erros.push(`${rotulo}: a placa ${placa} já está cadastrada.`);
    vistas.add(placa);

    if (!String(v.marca ?? '').trim()) erros.push(`${rotulo}: informe a marca.`);
    if (!String(v.modelo ?? '').trim()) erros.push(`${rotulo}: informe o modelo.`);
    if (!Number.isInteger(v.quilometragem) || v.quilometragem < 0) erros.push(`${rotulo}: informe a quilometragem atual.`);
    if (v.ano != null && (!Number.isInteger(v.ano) || v.ano < 1900 || v.ano > hoje.getFullYear() + 1)) {
      erros.push(`${rotulo}: ano inválido.`);
    }
  });

  return erros;
}

// Valida tudo antes de gravar: se algo falhar, nem o cliente nem os veículos são salvos.
// Retorna { ok: true, id_cliente } ou { ok: false, erros }.
function cadastrarCliente(db, dados, hoje = new Date()) {
  const erros = validarCliente(db, dados, hoje);
  if (erros.length > 0) return { ok: false, erros };

  const id_cliente = Math.max(0, ...db.clientes.map((c) => c.id_cliente)) + 1;
  db.clientes.push({
    id_cliente,
    nome: String(dados.nome).trim(),
    cpf: formatarCpf(dados.cpf),
    telefone: formatarTelefone(dados.telefone),
  });
  let proximoId = Math.max(0, ...db.automoveis.map((a) => a.id_automovel)) + 1;
  dados.veiculos.forEach((v) => {
    db.automoveis.push({
      id_automovel: proximoId++,
      placa: normalizarPlaca(v.placa),
      marca: String(v.marca).trim(),
      modelo: String(v.modelo).trim(),
      ano: v.ano ?? null,
      quilometragem: v.quilometragem,
      id_cliente,
    });
  });
  return { ok: true, id_cliente };
}

// ---------------------------------------------------------------------------
// US07 — Atualizar status da OS (Aberta → Em execução → Concluída)
// ---------------------------------------------------------------------------

const SEQUENCIA_STATUS = ['Aberta', 'Em execução', 'Concluída'];

// Próximo status permitido, ou null se a OS já está concluída
function proximoStatus(status) {
  const i = SEQUENCIA_STATUS.indexOf(status);
  return i >= 0 && i < SEQUENCIA_STATUS.length - 1 ? SEQUENCIA_STATUS[i + 1] : null;
}

const classeStatus = (status) => ({ 'Aberta': 'aberta', 'Em execução': 'exec', 'Concluída': 'concluida' }[status] || '');

// Só um mecânico responsável (relacionamento Executa) altera, sem pular etapas nem voltar.
// Retorna { ok: true, status } ou { ok: false, erros }.
function alterarStatusOrdem(db, id_os, id_mecanico, novoStatus, hoje = new Date()) {
  const os = db.ordens.find((o) => o.id_os === id_os);
  if (!os) return { ok: false, erros: ['Ordem de serviço não encontrada.'] };

  const erros = [];
  if (!os.mecanicos.includes(id_mecanico)) erros.push('Só um mecânico responsável por esta OS pode alterar o status.');

  const permitido = proximoStatus(os.status);
  if (!permitido) erros.push('Esta OS já está concluída e não pode mais mudar de status.');
  else if (novoStatus !== permitido) erros.push(`Não é possível ir de “${os.status}” para “${novoStatus}”. O próximo status permitido é “${permitido}”.`);

  if (erros.length > 0) return { ok: false, erros };

  os.status = novoStatus;
  if (novoStatus === 'Concluída') os.data_conclusao = dataISO(hoje);
  return { ok: true, status: novoStatus };
}
