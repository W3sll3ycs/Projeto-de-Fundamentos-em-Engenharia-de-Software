// Oficina Prime — dados do protótipo
// Os "registros" seguem as entidades do projeto de Banco de Dados (1ª etapa).
// Em vez de um banco, tudo fica salvo no localStorage do navegador.

const CHAVE_STORAGE = 'oficinaPrime.v1';

function dadosIniciais() {
  return {
    unidade: { id_unidade: 1, nome: 'Oficina Prime — Unidade Centro', cnpj: '12.345.678/0001-90' },
    setores: [
      { id_setor: 3, nome: 'Mecânica Geral' },
      { id_setor: 4, nome: 'Elétrica' },
      { id_setor: 5, nome: 'Funilaria e Pintura' },
    ],
    // Funcionário especializado em Atendente / Mecânico (Gerente não abre OS)
    atendentes: [
      { id_funcionario: 2, nome: 'Juliana Rocha', turno: 'Manhã' },
      { id_funcionario: 3, nome: 'Carla Nunes', turno: 'Tarde' },
    ],
    mecanicos: [
      { id_funcionario: 4, nome: 'Rafael Souza', especialidade: 'Motor e suspensão' },
      { id_funcionario: 5, nome: 'Tiago Alves', especialidade: 'Elétrica automotiva' },
      { id_funcionario: 6, nome: 'Beatriz Ferreira', especialidade: 'Funilaria' },
    ],
    clientes: [
      { id_cliente: 1, nome: 'Ana Beatriz Costa', cpf: '123.456.789-00', telefone: '(83) 98888-1111' },
      { id_cliente: 2, nome: 'João Pedro Silva', cpf: '987.654.321-00', telefone: '(83) 98888-2222' },
      { id_cliente: 3, nome: 'Transportes Sertão', cpf: '321.654.987-00', telefone: '(83) 98888-3333' },
    ],
    automoveis: [
      { id_automovel: 1, placa: 'QFA-1A23', marca: 'Fiat', modelo: 'Argo 1.0', ano: 2021, quilometragem: 42000, id_cliente: 1 },
      { id_automovel: 2, placa: 'OXB-4C56', marca: 'Honda', modelo: 'CG 160 Fan', ano: 2019, quilometragem: 31500, id_cliente: 2 },
      { id_automovel: 3, placa: 'PBD-7E89', marca: 'Volkswagen', modelo: 'Gol 1.6', ano: 2015, quilometragem: 118250, id_cliente: 2 },
      { id_automovel: 4, placa: 'RTS-2F34', marca: 'Mercedes', modelo: 'Accelo 1016', ano: 2018, quilometragem: 260000, id_cliente: 3 },
    ],
    servicos: [
      { id_servico: 1, descricao: 'Troca de óleo e filtro', valor: 150, id_setor: 3 },
      { id_servico: 2, descricao: 'Alinhamento e balanceamento', valor: 120, id_setor: 3 },
      { id_servico: 3, descricao: 'Revisão dos freios', valor: 220, id_setor: 3 },
      { id_servico: 4, descricao: 'Diagnóstico elétrico', valor: 180, id_setor: 4 },
      { id_servico: 5, descricao: 'Troca de bateria', valor: 80, id_setor: 4 },
      { id_servico: 6, descricao: 'Reparo de lataria (por peça)', valor: 350, id_setor: 5 },
    ],
    // Ordem de Serviço + relacionamentos N:N "Contém" (servicos) e "Executa" (mecanicos)
    ordens: [
      { id_os: 1, data_abertura: '2026-11-02', status: 'Em execução', data_conclusao: null, km_entrada: 118250,
        id_automovel: 3, id_atendente: 3, id_unidade: 1, servicos: [3], mecanicos: [4] },
    ],
  };
}

// Lê os dados salvos; se não houver (ou o navegador bloquear o storage), usa os iniciais.
let memoriaReserva = null;
function carregar() {
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE);
    if (salvo) return JSON.parse(salvo);
  } catch (e) { /* storage indisponível */ }
  if (!memoriaReserva) memoriaReserva = dadosIniciais();
  return memoriaReserva;
}

function salvar(db) {
  memoriaReserva = db;
  try { localStorage.setItem(CHAVE_STORAGE, JSON.stringify(db)); } catch (e) { /* segue só em memória */ }
}

function resetar() {
  try { localStorage.removeItem(CHAVE_STORAGE); } catch (e) { /* ignora */ }
  memoriaReserva = null;
}

// Formatação
const fmtMoeda = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtKm = (v) => v.toLocaleString('pt-BR') + ' km';
const fmtData = (iso) => iso.split('-').reverse().join('/');
