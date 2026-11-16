// Testes de aceitação da US01 (Dev3) — rodam no próprio navegador, sem bibliotecas.
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
console.log(`US01: ${passou}/${casos.length} testes passando`);
