// Testes de aceitação da US01, US04 e US07 (Dev3) — rodam no próprio navegador, sem bibliotecas.
montarLayout('testes');

// Ana Beatriz (cliente 1) com o Argo QFA-1A23 (veículo 1, 42.000 km), atendente Juliana (2)
const ordemValida = (mudancas = {}) => ({
  id_atendente: 2, id_cliente: 1, id_automovel: 1, km_entrada: 42350, servicos: [1, 2], mecanicos: [4], ...mudancas,
});

function verificar(condicao, mensagem) { if (!condicao) throw new Error(mensagem); }

function deveRecusar(mudancas, trecho) {
  return () => {
    const db = dadosIniciais();
    const r = abrirOrdemServico(db, ordemValida(mudancas));
    verificar(!r.ok, 'a OS deveria ter sido recusada');
    verificar(r.erros.some((e) => e.includes(trecho)), `esperava erro contendo "${trecho}"`);
    verificar(db.ordens.length === 1, 'nada deveria ter sido gravado');
  };
}

// US04 — um cliente novo (CPF e placa inéditos)
const veiculoValido = (m = {}) => ({ placa: 'abc1d23', marca: 'Chevrolet', modelo: 'Onix 1.0', ano: 2022, quilometragem: 15000, ...m });
const clienteValido = (m = {}) => ({ nome: 'Maria Oliveira', cpf: '11122233344', telefone: '83999990000', veiculos: [veiculoValido()], ...m });

function deveRecusarCliente(mudancas, trecho) {
  return () => {
    const db = dadosIniciais();
    const r = cadastrarCliente(db, clienteValido(mudancas));
    verificar(!r.ok, 'o cadastro deveria ter sido recusado');
    verificar(r.erros.some((e) => e.toLowerCase().includes(trecho.toLowerCase())), `esperava erro contendo "${trecho}"`);
    verificar(db.clientes.length === 3 && db.automoveis.length === 4, 'nada deveria ser gravado');
  };
}

// US07 — abre uma OS nova (status "Aberta", mecânico 4) para testar as transições
function osAberta() {
  const db = dadosIniciais();
  const r = abrirOrdemServico(db, ordemValida());
  return { db, id: r.id_os };
}

const casos = [
  ['CT01', 'Abre OS com dados válidos (status "Aberta", serviços e mecânicos gravados)', () => {
    const db = dadosIniciais();
    const r = abrirOrdemServico(db, ordemValida());
    verificar(r.ok, 'deveria abrir a OS');
    const os = db.ordens.find((o) => o.id_os === r.id_os);
    verificar(os.status === 'Aberta' && os.data_conclusao === null, 'status inicial incorreto');
    verificar(os.id_atendente === 2 && os.id_automovel === 1 && os.id_unidade === 1, 'vínculos incorretos');
    verificar(os.servicos.join() === '1,2' && os.mecanicos.join() === '4', 'serviços/mecânicos incorretos');
  }],
  ['CT02', 'Atualiza a quilometragem do veículo', () => {
    const db = dadosIniciais();
    abrirOrdemServico(db, ordemValida({ km_entrada: 43000 }));
    verificar(db.automoveis.find((a) => a.id_automovel === 1).quilometragem === 43000, 'km não atualizada');
  }],
  ['CT03', 'Aceita mais de um mecânico (relacionamento N:N Executa)', () => {
    const db = dadosIniciais();
    const r = abrirOrdemServico(db, ordemValida({ mecanicos: [4, 5] }));
    verificar(db.ordens.find((o) => o.id_os === r.id_os).mecanicos.length === 2, 'deveria ter 2 mecânicos');
  }],
  ['CT04', 'Mecânico não pode abrir OS (só atendente)', deveRecusar({ id_atendente: 4 }, 'atendente')],
  ['CT05', 'Recusa veículo de outro cliente', deveRecusar({ id_automovel: 2 }, 'não pertence')],
  ['CT06', 'Recusa km menor que a última registrada', deveRecusar({ km_entrada: 41000 }, 'não pode ser menor')],
  ['CT07', 'Recusa OS sem serviço', deveRecusar({ servicos: [] }, 'pelo menos um serviço')],
  ['CT08', 'Recusa OS sem mecânico', deveRecusar({ mecanicos: [] }, 'pelo menos um mecânico')],
  ['CT09', 'Recusa OS sem km de entrada', deveRecusar({ km_entrada: null }, 'quilometragem')],
  ['CT10', 'Bloqueia segunda OS em andamento para o mesmo veículo', () => {
    const db = dadosIniciais();
    abrirOrdemServico(db, ordemValida());
    const r = abrirOrdemServico(db, ordemValida({ km_entrada: 42400 }));
    verificar(!r.ok && r.erros.some((e) => e.includes('em andamento')), 'deveria bloquear');
  }],
  ['CT11', 'Nova OS aparece na lista de ordens em andamento', () => {
    const db = dadosIniciais();
    const r = abrirOrdemServico(db, ordemValida());
    const lista = listarEmAndamento(db);
    verificar(lista.length === 2 && lista[0].os.id_os === r.id_os, 'lista não atualizada');
  }],
  ['CT12', 'Calcula o valor estimado pelos serviços (R$ 150 + R$ 120)', () => {
    const db = dadosIniciais();
    const r = abrirOrdemServico(db, ordemValida());
    verificar(detalharOrdem(db, r.id_os).total === 270, 'valor estimado incorreto');
  }],
  // ---------------- US04 — Cadastrar cliente e veículos ----------------
  ['CT13', 'US04 · Cadastra cliente com veículo (CPF, telefone e placa são padronizados)', () => {
    const db = dadosIniciais();
    const r = cadastrarCliente(db, clienteValido());
    verificar(r.ok, 'deveria cadastrar');
    const c = db.clientes.find((x) => x.id_cliente === r.id_cliente);
    verificar(c.nome === 'Maria Oliveira' && c.cpf === '111.222.333-44' && c.telefone === '(83) 99999-0000', 'dados do cliente incorretos');
    const v = db.automoveis.filter((a) => a.id_cliente === r.id_cliente);
    verificar(v.length === 1 && v[0].placa === 'ABC-1D23' && v[0].quilometragem === 15000, 'veículo incorreto');
  }],
  ['CT14', 'US04 · Cadastra vários veículos para o mesmo cliente (1:N)', () => {
    const db = dadosIniciais();
    const r = cadastrarCliente(db, clienteValido({ veiculos: [veiculoValido(), veiculoValido({ placa: 'DEF-5678', modelo: 'Onix' })] }));
    verificar(r.ok && db.automoveis.filter((a) => a.id_cliente === r.id_cliente).length === 2, 'deveria ter 2 veículos');
  }],
  ['CT15', 'US04 · Recusa CPF já cadastrado', deveRecusarCliente({ cpf: '123.456.789-00' }, 'CPF')],
  ['CT16', 'US04 · Recusa placa já cadastrada', deveRecusarCliente({ veiculos: [veiculoValido({ placa: 'qfa1a23' })] }, 'já está cadastrada')],
  ['CT17', 'US04 · Recusa placa repetida dentro do mesmo cadastro', deveRecusarCliente({ veiculos: [veiculoValido(), veiculoValido()] }, 'repetida')],
  ['CT18', 'US04 · Recusa cliente sem nome ou sem telefone', () => {
    deveRecusarCliente({ nome: '' }, 'nome')();
    deveRecusarCliente({ telefone: '123' }, 'telefone')();
  }],
  ['CT19', 'US04 · Recusa cliente sem veículo', deveRecusarCliente({ veiculos: [] }, 'pelo menos um veículo')],
  ['CT20', 'US04 · Recusa veículo sem marca, modelo, km ou com placa inválida', () => {
    deveRecusarCliente({ veiculos: [veiculoValido({ marca: '' })] }, 'marca')();
    deveRecusarCliente({ veiculos: [veiculoValido({ modelo: ' ' })] }, 'modelo')();
    deveRecusarCliente({ veiculos: [veiculoValido({ quilometragem: null })] }, 'quilometragem')();
    deveRecusarCliente({ veiculos: [veiculoValido({ quilometragem: -5 })] }, 'quilometragem')();
    deveRecusarCliente({ veiculos: [veiculoValido({ placa: '12-ABC' })] }, 'placa inválida')();
  }],
  ['CT21', 'US04 · Erro em um veículo não grava nem o cliente (tudo ou nada)', () => {
    const db = dadosIniciais();
    const r = cadastrarCliente(db, clienteValido({ veiculos: [veiculoValido(), veiculoValido({ placa: 'DEF-5678', marca: '' })] }));
    verificar(!r.ok && db.clientes.length === 3 && db.automoveis.length === 4, 'nada deveria ser gravado');
  }],
  ['CT22', 'US04 · Cliente recém-cadastrado já consegue abrir uma OS (integração com a US01)', () => {
    const db = dadosIniciais();
    const c = cadastrarCliente(db, clienteValido());
    const veiculo = db.automoveis.find((a) => a.id_cliente === c.id_cliente);
    const r = abrirOrdemServico(db, ordemValida({ id_cliente: c.id_cliente, id_automovel: veiculo.id_automovel, km_entrada: 15200 }));
    verificar(r.ok, 'deveria abrir a OS: ' + (r.erros || []).join(' | '));
  }],

  // ---------------- US07 — Atualizar status da OS ----------------
  ['CT23', 'US07 · Mecânico responsável muda de "Aberta" para "Em execução"', () => {
    const { db, id } = osAberta();
    const r = alterarStatusOrdem(db, id, 4, 'Em execução');
    verificar(r.ok && db.ordens.find((o) => o.id_os === id).status === 'Em execução', 'status não mudou');
  }],
  ['CT24', 'US07 · Ao concluir, registra a data de conclusão', () => {
    const db = dadosIniciais(); // a OS 1 já está "Em execução", mecânico 4
    const r = alterarStatusOrdem(db, 1, 4, 'Concluída', new Date(2026, 10, 20, 10));
    const os = db.ordens[0];
    verificar(r.ok && os.status === 'Concluída' && os.data_conclusao === '2026-11-20', 'conclusão não registrada');
  }],
  ['CT25', 'US07 · Recusa pular etapa (Aberta → Concluída)', () => {
    const { db, id } = osAberta();
    const r = alterarStatusOrdem(db, id, 4, 'Concluída');
    verificar(!r.ok && db.ordens.find((o) => o.id_os === id).status === 'Aberta', 'não deveria pular etapa');
  }],
  ['CT26', 'US07 · Recusa voltar de "Concluída" e voltar de "Em execução"', () => {
    const db = dadosIniciais();
    verificar(!alterarStatusOrdem(db, 1, 4, 'Aberta').ok, 'não deveria voltar para Aberta');
    alterarStatusOrdem(db, 1, 4, 'Concluída');
    verificar(!alterarStatusOrdem(db, 1, 4, 'Em execução').ok, 'não deveria reabrir OS concluída');
    verificar(db.ordens[0].status === 'Concluída', 'status deveria continuar Concluída');
  }],
  ['CT27', 'US07 · Recusa mecânico que não é responsável pela OS', () => {
    const db = dadosIniciais(); // OS 1 é do mecânico 4
    const r = alterarStatusOrdem(db, 1, 5, 'Concluída');
    verificar(!r.ok && r.erros.some((e) => e.includes('responsável')) && db.ordens[0].status === 'Em execução', 'deveria recusar');
    verificar(!alterarStatusOrdem(db, 1, null, 'Concluída').ok, 'sem mecânico deveria recusar');
  }],
  ['CT28', 'US07 · OS concluída sai da lista de andamento e libera o veículo para nova OS', () => {
    const db = dadosIniciais(); // OS 1: Gol (veículo 3) do cliente 2
    alterarStatusOrdem(db, 1, 4, 'Concluída');
    verificar(listarEmAndamento(db).length === 0, 'não deveria estar em andamento');
    const r = abrirOrdemServico(db, ordemValida({ id_cliente: 2, id_automovel: 3, km_entrada: 118300 }));
    verificar(r.ok, 'veículo deveria estar liberado: ' + (r.erros || []).join(' | '));
  }],
];

let passou = 0;
const linhas = casos.map(([id, nome, teste]) => {
  try {
    teste();
    passou++;
    return `<div class="teste"><span class="res passou">PASSOU</span><b>${id}</b><span>${esc(nome)}</span></div>`;
  } catch (e) {
    return `<div class="teste"><span class="res falhou">FALHOU</span><b>${id}</b><span>${esc(nome)} <code>— ${esc(e.message)}</code></span></div>`;
  }
});
document.getElementById('lista').innerHTML = linhas.join('');
document.getElementById('resumo').innerHTML =
  `<span style="color:${passou === casos.length ? 'var(--ok-texto)' : 'var(--erro-texto)'}">${passou}/${casos.length}</span> testes passando`;
console.log(`US01/US04/US07: ${passou}/${casos.length} testes passando`);
