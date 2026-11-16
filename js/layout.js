// Cabeçalho e rodapé comuns a todas as páginas
function montarLayout(paginaAtiva) {
  document.body.insertAdjacentHTML('afterbegin', `
    <header class="topo">
      <div class="topo-inner">
        <a class="marca" href="index.html">
          <span class="marca-icone">OP</span>
          <span>Oficina Prime <small>Unidade Centro</small></span>
        </a>
        <nav>
          <a href="index.html" class="${paginaAtiva === 'lista' ? 'ativo' : ''}">Ordens em andamento</a>
          <a href="nova-os.html" class="botao">+ Nova OS</a>
        </nav>
      </div>
    </header>`);
  document.body.insertAdjacentHTML('beforeend', `
    <footer>Protótipo · US01 — Abrir ordem de serviço · Atividade 03 (XP) ·
      <a href="testes.html">testes</a> ·
      <a href="#" id="resetar">restaurar dados de exemplo</a></footer>`);
  document.getElementById('resetar').addEventListener('click', (e) => {
    e.preventDefault();
    resetar();
    location.href = 'index.html';
  });
}

// Mensagem de sucesso que passa de uma página para outra
function avisar(msg) { try { sessionStorage.setItem('aviso', msg); } catch (e) { /* ignora */ } }
function mostrarAviso() {
  let msg = null;
  try { msg = sessionStorage.getItem('aviso'); sessionStorage.removeItem('aviso'); } catch (e) { /* ignora */ }
  if (msg) document.querySelector('main').insertAdjacentHTML('afterbegin', `<div class="alerta sucesso">${msg}</div>`);
}

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
