/**
 * ============================================================================
 * iKanban - Lógica do Dashboard Analítico
 * Stack: HTML5, CSS3, jQuery, JavaScript e Chart.js
 * ============================================================================
 */

// Chaves idênticas às do kanban para ler os mesmos dados persistidos
const STORAGE_KEY = 'ikanban_apple_tasks';
const STORAGE_KEY_TABS = 'ikanban_apple_tabs';

// Instâncias globais dos gráficos para permitir atualização limpa
let chartStatusInstance = null;
let chartCategoriasInstance = null;
let chartPontualidadeInstance = null;

$(document).ready(function () {
  iniciarRelogio();
  inicializarFiltroAbas();
  carregarEMostrarMetricas();

  // Recalcular métricas ao mudar o filtro de abas
  $('#filtro-aba-dashboard').on('change', function () {
    carregarEMostrarMetricas();
  });
});

// ============================================================================
// INICIALIZAÇÃO DO SELETOR DE FILTRO DE ABAS
// ============================================================================
function inicializarFiltroAbas() {
  const dadosAbas = localStorage.getItem(STORAGE_KEY_TABS);
  if (dadosAbas) {
    try {
      const tabs = JSON.parse(dadosAbas);
      const $select = $('#filtro-aba-dashboard');
      tabs.forEach(function (tab) {
        $select.append(`<option value="${tab.id}">📁 ${tab.title}</option>`);
      });
    } catch (e) {
      console.error('Erro ao ler abas para o dashboard:', e);
    }
  }
}

// ============================================================================
// RELÓGIO DA SUB-BARRA ESTILO MAC OS
// ============================================================================
function iniciarRelogio() {
  function atualizar() {
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    $('#data-relogio').text(`${dataFormatada} ${horaFormatada}`);
  }
  atualizar();
  setInterval(atualizar, 1000);
}

// ============================================================================
// CARREGAMENTO DOS DADOS E CÁLCULO DAS MÉTRICAS
// ============================================================================
function carregarEMostrarMetricas() {
  const dadosSalvos = localStorage.getItem(STORAGE_KEY);
  let tasks = [];

  if (dadosSalvos) {
    try {
      tasks = JSON.parse(dadosSalvos);
    } catch (e) {
      console.error('Erro ao ler tarefas para o dashboard:', e);
    }
  }

  // Filtra por aba selecionada, se não for "todas"
  const abaSelecionada = $('#filtro-aba-dashboard').val() || 'todas';
  if (abaSelecionada !== 'todas') {
    tasks = tasks.filter(t => (t.tabId || 'tab-principal') === abaSelecionada);
  }

  const agora = Date.now();

  // 1. Contagens por Status e Condição de Prazo
  let pendentes = 0;
  let execucao = 0;
  let concluidas = 0;
  let concluidasComAtraso = 0;
  let ativasVencidas = 0;

  // 2. Contagens por Categoria
  const contagemCategorias = {
    'Trabalho': 0,
    'Estudos': 0,
    'Pessoal': 0,
    'Projetos': 0,
    'Geral': 0
  };

  tasks.forEach(function (task) {
    const categoria = task.category || 'Geral';
    contagemCategorias[categoria] = (contagemCategorias[categoria] || 0) + 1;

    const dataLimite = task.deadline ? new Date(task.deadline).getTime() : null;
    const venceu = dataLimite && dataLimite < agora;

    if (task.status === 'todo') {
      pendentes++;
      if (venceu) ativasVencidas++;
    } else if (task.status === 'doing') {
      execucao++;
      if (venceu) ativasVencidas++;
    } else if (task.status === 'done') {
      concluidas++;
      // Tarefa concluída fora do prazo tem completionNote preenchido
      if (task.completionNote) {
        concluidasComAtraso++;
      }
    }
  });

  const concluidasNoPrazo = concluidas - concluidasComAtraso;

  // Atualização dos Indicadores Numéricos na Interface
  $('#stat-pendentes').text(pendentes);
  $('#stat-execucao').text(execucao);
  $('#stat-concluidas').text(concluidas);
  $('#stat-concluidas-atraso').text(concluidasComAtraso);
  $('#stat-ativas-vencidas').text(ativasVencidas);

  // Renderização dos Gráficos com Chart.js
  renderizarGraficoStatus(pendentes, execucao, concluidas);
  renderizarGraficoCategorias(contagemCategorias);
  renderizarGraficoPontualidade(concluidasNoPrazo, concluidasComAtraso);
}

// ============================================================================
// CONFIGURAÇÃO DOS GRÁFICOS ANALÍTICOS (ESTILO APPLE RETRÔ)
// ============================================================================

// Fonte padrão idêntica à tipografia do sistema
Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Lucida Grande", "Helvetica Neue", Arial, sans-serif';
Chart.defaults.color = '#4a5460';

/**
 * Gráfico 1: Distribuição Geral por Status (Rosca / Doughnut)
 */
function renderizarGraficoStatus(pendentes, execucao, concluidas) {
  const ctx = document.getElementById('chart-status').getContext('2d');

  if (chartStatusInstance) {
    chartStatusInstance.destroy();
  }

  chartStatusInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['A Fazer', 'Em Execução', 'Concluídas'],
      datasets: [{
        data: [pendentes, execucao, concluidas],
        backgroundColor: [
          '#f6b244', // Amarelo clássico
          '#3d98ef', // Azul Aqua
          '#35b344'  // Verde Maçã
        ],
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } }
        }
      }
    }
  });
}

/**
 * Gráfico 2: Volume de Tarefas por Categoria (Barras Verticais)
 */
function renderizarGraficoCategorias(contagemCategorias) {
  const ctx = document.getElementById('chart-categorias').getContext('2d');

  if (chartCategoriasInstance) {
    chartCategoriasInstance.destroy();
  }

  const labels = Object.keys(contagemCategorias);
  const data = Object.values(contagemCategorias);

  chartCategoriasInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Tarefas',
        data: data,
        backgroundColor: [
          '#206db2', // Trabalho (Azul)
          '#62349e', // Estudos (Roxo)
          '#248c4a', // Pessoal (Verde)
          '#c7670c', // Projetos (Laranja)
          '#717a85'  // Geral (Cinza)
        ],
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0 }
        }
      }
    }
  });
}

/**
 * Gráfico 3: Pontualidade de Conclusão (Pizza / Pie)
 */
function renderizarGraficoPontualidade(noPrazo, comAtraso) {
  const ctx = document.getElementById('chart-pontualidade').getContext('2d');

  if (chartPontualidadeInstance) {
    chartPontualidadeInstance.destroy();
  }

  // Se ainda não houver tarefas finalizadas, exibe visual neutro
  const total = noPrazo + comAtraso;
  const labels = total === 0 ? ['Sem dados de conclusão'] : ['No Prazo', 'Com Atraso (Justificada)'];
  const data = total === 0 ? [1] : [noPrazo, comAtraso];
  const colors = total === 0 ? ['#d0d5dc'] : ['#28c840', '#e02424'];

  chartPontualidadeInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } }
        }
      }
    }
  });
}

