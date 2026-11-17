# Oficina Prime — protótipo (US01, US04 e US07)

Protótipo da Atividade 03 (Desenvolvimento Ágil + Prática de XP), feito só com
**HTML, CSS e JavaScript** — sem servidor de aplicação e sem banco de dados.
Os dados (clientes, veículos, serviços, mecânicos e ordens de serviço) seguem as entidades do
projeto de Banco de Dados e ficam salvos no **localStorage** do navegador.

## Como rodar em localhost

Escolha **uma** das opções abaixo.

**Opção 1 — VS Code + Live Server (mais simples)**
1. Abra a pasta `oficina-prime` no VS Code.
2. Instale a extensão **Live Server** (Ritwick Dey).
3. Clique com o botão direito em `index.html` → **Open with Live Server**.
   Abre em `http://127.0.0.1:5500/index.html`.

**Opção 2 — terminal com Python** (abra o terminal dentro da pasta `oficina-prime`)
```bash
python -m http.server 5500
```
Inicia um servidor web simples do próprio Python que só *entrega os arquivos da pasta atual*
para o navegador; não instala nada nem altera arquivos. Acesse `http://localhost:5500`.
Para parar: `Ctrl + C` no terminal.

> Também funciona abrindo o `index.html` direto (duplo clique), mas para mostrar "em localhost"
> use uma das opções acima.

## Páginas

| Página | O que mostra |
|---|---|
| `index.html` | Ordens de serviço em andamento + contador |
| `nova-os.html` | Formulário da US01 (abrir OS) |
| `cadastro-cliente.html` | **US04** — cadastrar cliente e veículos |
| `os.html?id=N` | Detalhe da OS; na parte de baixo, **US07** — atualizar status |
| `testes.html` | Testes de aceitação (CT01–CT28) rodando no navegador (Dev3) |

No rodapé de todas as páginas há o link **restaurar dados de exemplo**, que apaga o que foi
salvo no localStorage e volta ao estado inicial (use antes de apresentar).

## Roteiro sugerido para a demonstração

1. Abra `index.html` → existe 1 OS em andamento (Gol PBD-7E89).
2. Clique em **+ Nova OS**: atendente *Juliana Rocha*, cliente *Ana Beatriz Costa*
   (o campo veículo passa a mostrar só os veículos dela) e o Argo **QFA-1A23**.
3. Mostre uma regra de negócio: km **41000** e nenhum mecânico → o sistema recusa e explica.
4. Corrija: km **42350**, serviços *Troca de óleo* + *Alinhamento*, mecânico *Rafael Souza* →
   **Abrir ordem de serviço**. Aparece o detalhe da OS nº 2 com o valor estimado (R$ 270,00).
5. Volte à lista: contador **2 em andamento**. Recarregue a página (F5) — a OS continua lá
   (localStorage).
6. Tente abrir outra OS para o mesmo Argo → bloqueado (já há OS em andamento).
7. **US04:** em **Cadastrar cliente**, preencha nome, CPF, telefone e um veículo (placa `ABC-1D23`).
   Tente repetir um CPF/placa já existente → recusado. Ao salvar, vai direto para *Nova OS* com o cliente selecionado.
8. **US07:** abra uma OS, escolha um mecânico que **não** é responsável → recusado. Com o responsável,
   mude *Aberta → Em execução → Concluída*; a OS concluída sai da lista e o veículo fica liberado.
9. Abra `testes.html` → **28/28 testes passando**.

## Estrutura

| Arquivo | Conteúdo |
|---|---|
| `js/dados.js` | Dados de exemplo e leitura/gravação no localStorage |
| `js/regras.js` | Regras de negócio: abrir OS (US01), cadastrar cliente (US04), alterar status (US07) |
| `js/cadastro-cliente.js` | Tela de cadastro de cliente e veículos (linhas de veículo dinâmicas) |
| `js/nova-os.js` | Comportamento da tela de abrir OS (filtro cliente → veículo, total, envio) |
| `js/layout.js` | Cabeçalho, rodapé e mensagens comuns |
| `js/testes.js` | Casos de teste CT01–CT12 (US01), CT13–CT22 (US04), CT23–CT28 (US07) |
| `css/style.css` | Estilo das telas |

## Critérios de aceitação implementados

- Só funcionários da especialização **Atendente** abrem OS.
- O veículo precisa pertencer ao cliente selecionado.
- Km de entrada obrigatória e não pode ser menor que a última km registrada do veículo
  (a km do veículo é atualizada ao abrir a OS).
- Pelo menos **um serviço** e **um mecânico** (relacionamentos N:N *Contém* e *Executa*).
- Um veículo não pode ter duas OS em andamento ao mesmo tempo.
- A OS nasce com status **Aberta**, data do dia e vinculada à unidade, e aparece na lista.

## US04 — Cadastrar cliente e veículos (critérios implementados)

- Nome, CPF (11 dígitos) e telefone com DDD obrigatórios; CPF e telefone são padronizados ao salvar.
- CPF único entre os clientes; pelo menos um veículo por cliente (relacionamento 1:N).
- Veículo: placa válida (antiga ou Mercosul, única no sistema e no cadastro), marca, modelo e km atual obrigatórios; ano opcional.
- Tudo ou nada: se qualquer dado for inválido, nem o cliente nem os veículos são gravados.
- Ao salvar, abre *Nova OS* com o cliente já selecionado.

## US07 — Atualizar status da OS (critérios implementados)

- Sequência única: **Aberta → Em execução → Concluída**; não pula etapa e não volta.
- Só um mecânico responsável pela OS (relacionamento *Executa*) pode alterar. Como ainda não há login (US08),
  o mecânico é escolhido numa lista na página da OS.
- Ao concluir, grava a data de conclusão; a OS sai da lista "em andamento" e o veículo fica liberado para nova OS.
