/**
 * ============================================================================
 * iKanban - Sistema de Gerenciamento de Tarefas Clássico (Estilo Apple OS X)
 * Stack: HTML5, CSS3, jQuery e JavaScript
 * ============================================================================
 */

// Chaves utilizadas para persistência dos dados no localStorage
const STORAGE_KEY = 'ikanban_apple_tasks';
const STORAGE_KEY_TABS = 'ikanban_apple_tabs';

// Lista em memória das tarefas e abas
let tasks = [];
let tabs = [];
let activeTabId = 'tab-principal';

// Variável temporária para guardar a tarefa pendente de justificativa de atraso
let pendingOverdueTask = null;

// ============================================================================
// INICIALIZAÇÃO DA APLICAÇÃO (Executa quando o documento estiver pronto)
// ============================================================================
$(document).ready(function () {
  iniciarRelogio();
  carregarAbas();
  carregarTarefas();
  configurarEventosUI();
  configurarEventosAbas();
  configurarDragAndDrop();
  renderizarAbas();
  renderizarQuadro();
});

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
// CARREGAMENTO E GERENCIAMENTO DE ABAS (localStorage)
// ============================================================================

/**
 * Carrega a lista de abas do localStorage ou inicia com as abas padrão
 */
function carregarAbas() {
  const dadosAbas = localStorage.getItem(STORAGE_KEY_TABS);
  if (dadosAbas) {
    try {
      tabs = JSON.parse(dadosAbas);
    } catch (e) {
      console.error('Erro ao ler abas do localStorage', e);
    }
  }

  // Abas padrão se não houver dados salvos
  if (!tabs || tabs.length === 0) {
    tabs = [
      { id: 'tab-principal', title: 'Principal' },
      { id: 'tab-estudos', title: 'Estudos Antigravity' }
    ];
    salvarAbas();
  }

  // Define a aba ativa padrão
  if (!tabs.some(t => t.id === activeTabId)) {
    activeTabId = tabs[0].id;
  }
}

/**
 * Persiste a lista de abas no localStorage
 */
function salvarAbas() {
  localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(tabs));
}

/**
 * Renderiza os elementos visuais das abas na barra estilo Safari / Mac OS
 */
function renderizarAbas() {
  const $list = $('#tabs-list').empty();

  tabs.forEach(function (tab) {
    const isActive = tab.id === activeTabId;
    const $tabItem = $('<div></div>')
      .addClass('tab-item')
      .toggleClass('active', isActive)
      .attr('data-id', tab.id);

    const $title = $('<span></span>').text(tab.title);
    $tabItem.append($title);

    // Permite fechar apenas se houver mais de uma aba no sistema
    if (tabs.length > 1) {
      const $btnClose = $('<button type="button" class="tab-close-btn" title="Excluir aba">&times;</button>');
      $tabItem.append($btnClose);
    }

    $list.append($tabItem);
  });
}

// ============================================================================
// CARREGAMENTO E PERSISTÊNCIA LOCAL (localStorage)
// ============================================================================

/**
 * Carrega tarefas do localStorage. Caso seja a primeira execução,
 * popula com dados de exemplo didáticos para facilitar a aula.
 */
function carregarTarefas() {
  const dadosSalvos = localStorage.getItem(STORAGE_KEY);

  if (dadosSalvos) {
    try {
      tasks = JSON.parse(dadosSalvos);
      // Garante compatibilidade retroativa com tarefas já cadastradas
      tasks.forEach(t => {
        if (!t.category) t.category = 'Geral';
        if (!t.tabId) t.tabId = 'tab-principal';
      });
      return;
    } catch (e) {
      console.error('Erro ao ler localStorage, reiniciando dados de exemplo.', e);
    }
  }

  // Dados iniciais com exemplos de: no prazo, atrasada e já finalizada
  const agora = new Date();
  const dataAmanha = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
  const dataOntem = new Date(agora.getTime() - 24 * 60 * 60 * 1000);

  tasks = [
    {
      id: 'task-1',
      title: 'Apresentar introdução ao Antigravity',
      description: 'Demonstrar conceitos básicos para os alunos na aula inaugural.',
      deadline: dataAmanha.toISOString().slice(0, 16),
      category: 'Trabalho',
      tabId: 'tab-principal',
      status: 'todo', // A Fazer
      createdAt: agora.toISOString(),
      completionNote: null
    },
    {
      id: 'task-2',
      title: 'Entregar relatório de planejamento',
      description: 'Exemplo de tarefa atrasada para testar a restrição de justificativa.',
      deadline: dataOntem.toISOString().slice(0, 16),
      category: 'Projetos',
      tabId: 'tab-principal',
      status: 'doing', // Em Execução (Vencida!)
      createdAt: agora.toISOString(),
      completionNote: null
    },
    {
      id: 'task-3',
      title: 'Configuração do ambiente de desenvolvimento',
      description: 'Tarefa já finalizada na aba de Estudos. O status dela fica bloqueado.',
      deadline: dataOntem.toISOString().slice(0, 16),
      category: 'Estudos',
      tabId: 'tab-estudos',
      status: 'done', // Finalizada
      createdAt: agora.toISOString(),
      completionNote: 'Concluído com suporte técnico.'
    }
  ];

  salvarTarefas();
}

/**
 * Salva a lista de tarefas atualizada no localStorage
 */
function salvarTarefas() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ============================================================================
// RENDERIZAÇÃO DO QUADRO KANBAN
// ============================================================================

/**
 * Formata data ISO para o padrão brasileiro (DD/MM/AAAA HH:mm)
 */
function formatarDataBR(dataIso) {
  if (!dataIso) return 'Sem prazo';
  const d = new Date(dataIso);
  if (isNaN(d.getTime())) return dataIso;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Verifica se a tarefa está fora do prazo estipulado
 */
function estaVencida(task) {
  if (!task.deadline) return false;
  return new Date(task.deadline).getTime() < new Date().getTime();
}

/**
 * Retorna o HTML do badge de categoria com o estilo clássico correspondente
 */
function obterHtmlBadgeCategoria(categoria) {
  const cat = categoria || 'Geral';
  const mapaCategorias = {
    'Trabalho': { classe: 'cat-trabalho', icone: '💼' },
    'Estudos': { classe: 'cat-estudos', icone: '📚' },
    'Pessoal': { classe: 'cat-pessoal', icone: '👤' },
    'Projetos': { classe: 'cat-projetos', icone: '🚀' },
    'Geral': { classe: 'cat-geral', icone: '📌' }
  };
  const config = mapaCategorias[cat] || { classe: 'cat-geral', icone: '📌' };
  return `<span class="badge-category ${config.classe}">${config.icone} ${escapeHtml(cat)}</span>`;
}

/**
 * Renderiza todos os cartões nas respectivas colunas para a aba ativa
 */
function renderizarQuadro() {
  // Limpa o conteúdo das 3 colunas
  $('.dropzone').empty();

  // Contadores de status da aba ativa
  let contadores = { todo: 0, doing: 0, done: 0 };

  // Filtra as tarefas associadas à aba ativa atualmente
  const tarefasAbaAtiva = tasks.filter(function (task) {
    const tabId = task.tabId || 'tab-principal';
    return tabId === activeTabId;
  });

  tarefasAbaAtiva.forEach(function (task) {
    contadores[task.status] = (contadores[task.status] || 0) + 1;

    const vencida = estaVencida(task);
    const finalizada = task.status === 'done';

    // Criação do elemento do cartão
    const $card = $('<div></div>')
      .addClass('task-card')
      .attr('id', task.id)
      .attr('data-id', task.id);

    // RESTRIÇÃO 1: Tarefas concluídas não podem ser arrastadas nem mudar de status
    if (finalizada) {
      $card.addClass('completed');
      $card.attr('draggable', 'false'); // Desativa drag & drop
    } else {
      $card.attr('draggable', 'true'); // Habilita drag & drop para tarefas ativas
      if (vencida) {
        $card.addClass('overdue'); // Destaque visual vermelho para atrasadas
      }
    }

    // Monta o cabeçalho do cartão com título, categoria e crachá de status
    let badgeHtml = '';
    if (finalizada) {
      badgeHtml = '<span class="badge-completed">✓ Concluída</span>';
    } else if (vencida) {
      badgeHtml = '<span class="badge-overdue">⚠️ Fora do Prazo</span>';
    }

    const headerHtml = `
      <div class="task-header">
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span class="task-title">${escapeHtml(task.title)}</span>
          <div>${obterHtmlBadgeCategoria(task.category)}</div>
        </div>
        ${badgeHtml}
      </div>
    `;

    // Descrição da tarefa
    const descHtml = task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : '';

    // Metadados (Prazo de Conclusão)
    const prazoHtml = `
      <div class="task-meta">
        <span>⏰ Prazo:</span>
        <strong>${formatarDataBR(task.deadline)}</strong>
      </div>
    `;

    // Caixa de justificativa se a tarefa foi finalizada com nota
    let notaHtml = '';
    if (finalizada && task.completionNote) {
      notaHtml = `
        <div class="task-note-box">
          <strong>Justificativa de Atraso:</strong><br>
          ${escapeHtml(task.completionNote)}
        </div>
      `;
    }

    // Botões de Ações do Cartão
    let actionsHtml = '<div class="task-actions">';
    if (finalizada) {
      // Tarefa finalizada: status travado, apenas aviso visual e exclusão permitida
      actionsHtml += `
        <span class="task-locked-notice">🔒 Status Bloqueado</span>
        <button class="task-btn-action task-btn-delete" data-action="delete" title="Excluir">Excluir</button>
      `;
    } else {
      // Tarefa ativa: permite finalizar diretamente, editar e excluir
      actionsHtml += `
        <button class="task-btn-action task-btn-finish" data-action="finish" title="Concluir Tarefa">✓ Finalizar</button>
        <button class="task-btn-action" data-action="edit" title="Editar Tarefa">Editar</button>
        <button class="task-btn-action task-btn-delete" data-action="delete" title="Excluir">Excluir</button>
      `;
    }
    actionsHtml += '</div>';

    // Monta o cartão completo e anexa na coluna correspondente
    $card.append(headerHtml, descHtml, prazoHtml, notaHtml, actionsHtml);
    $(`.dropzone[data-status="${task.status}"]`).append($card);
  });

  // Atualiza os contadores numéricos dos cabeçalhos
  $('#count-todo').text(contadores.todo);
  $('#count-doing').text(contadores.doing);
  $('#count-done').text(contadores.done);
}

// ============================================================================
// SISTEMA DE DRAG AND DROP (Arrastar e Soltar)
// ============================================================================
function configurarDragAndDrop() {
  // Início do arraste do cartão
  $(document).on('dragstart', '.task-card', function (e) {
    const taskId = $(this).attr('data-id');
    const task = tasks.find(t => t.id === taskId);

    // Bloqueia arraste se a tarefa já estiver finalizada
    if (task && task.status === 'done') {
      e.preventDefault();
      alert('Esta tarefa já foi concluída e não pode ter seu status alterado.');
      return false;
    }

    $(this).addClass('dragging');
    e.originalEvent.dataTransfer.setData('text/plain', taskId);
  });

  // Fim do arraste (limpeza visual)
  $(document).on('dragend', '.task-card', function () {
    $(this).removeClass('dragging');
    $('.dropzone').removeClass('drag-over');
  });

  // Quando o cartão é arrastado por cima da coluna (dropzone)
  $('.dropzone').on('dragover', function (e) {
    e.preventDefault(); // Necessário para permitir o drop
    $(this).addClass('drag-over');
  });

  // Quando o cartão sai da área da coluna
  $('.dropzone').on('dragleave', function () {
    $(this).removeClass('drag-over');
  });

  // Ao soltar o cartão em uma coluna de destino
  $('.dropzone').on('drop', function (e) {
    e.preventDefault();
    $(this).removeClass('drag-over');

    const taskId = e.originalEvent.dataTransfer.getData('text/plain');
    const targetStatus = $(this).attr('data-status');

    if (taskId && targetStatus) {
      processarMudancaDeStatus(taskId, targetStatus);
    }
  });
}

// ============================================================================
// VALIDAÇÃO E REGRAS DE TRANSIÇÃO DE STATUS
// ============================================================================

/**
 * Processa a alteração de status respeitando as regras de negócio:
 * 1. Tarefa concluída não muda de status.
 * 2. Tarefa vencida exige nota obrigatória para ser finalizada.
 * 3. Tarefa no prazo pode ser finalizada diretamente sem nota.
 */
function processarMudancaDeStatus(taskId, novoStatus) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  // RESTRIÇÃO 1: Tarefas concluídas não podem sofrer alteração de status
  if (task.status === 'done') {
    alert('Regra do Sistema: Tarefas concluídas não podem ter seu status alterado!');
    return;
  }

  // Se o status de destino for o mesmo atual, não faz nada
  if (task.status === novoStatus) {
    return;
  }

  // Se o destino for "Finalizado", verifica se está vencida ou no prazo
  if (novoStatus === 'done') {
    if (estaVencida(task)) {
      // RESTRIÇÃO 2: Vencida -> Requer justificativa obrigatória
      abrirModalJustificativa(task);
      return;
    } else {
      // Finalização no prazo ou antes do prazo (permitido sem justificativa)
      task.status = 'done';
      task.completionNote = null;
      salvarTarefas();
      renderizarQuadro();
      return;
    }
  }

  // Mudança normal entre "A Fazer" e "Em Execução"
  task.status = novoStatus;
  salvarTarefas();
  renderizarQuadro();
}

// ============================================================================
// EVENTOS E INTERAÇÃO COM AS ABAS
// ============================================================================
function configurarEventosAbas() {
  // Alternar entre abas ao clicar em uma delas
  $(document).on('click', '.tab-item', function (e) {
    if ($(e.target).hasClass('tab-close-btn')) return;
    const tabId = $(this).attr('data-id');
    if (tabId && tabId !== activeTabId) {
      activeTabId = tabId;
      renderizarAbas();
      renderizarQuadro();
    }
  });

  // Excluir uma aba
  $(document).on('click', '.tab-close-btn', function (e) {
    e.stopPropagation();
    const tabId = $(this).closest('.tab-item').attr('data-id');
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    if (confirm(`Deseja realmente excluir a aba "${tab.title}"?\nTodas as tarefas desta aba também serão excluídas.`)) {
      tabs = tabs.filter(t => t.id !== tabId);
      tasks = tasks.filter(t => (t.tabId || 'tab-principal') !== tabId);
      salvarAbas();
      salvarTarefas();

      // Se a aba excluída era a ativa, redireciona para a primeira disponível
      if (activeTabId === tabId) {
        activeTabId = tabs[0].id;
      }
      renderizarAbas();
      renderizarQuadro();
    }
  });

  // Abrir modal de criação de nova aba
  $('#btn-add-tab').on('click', function () {
    $('#aba-nome').val('');
    $('#modal-aba').addClass('active');
    $('#aba-nome').focus();
  });

  // Fechar modal de nova aba
  $('#btn-fechar-modal-aba, #btn-cancelar-aba').on('click', function () {
    $('#modal-aba').removeClass('active');
  });

  // Submissão do formulário de criação de nova aba
  $('#form-aba').on('submit', function (e) {
    e.preventDefault();
    const nome = $('#aba-nome').val().trim();
    if (!nome) {
      alert('Por favor, informe o nome da nova aba.');
      return;
    }

    const novaAba = {
      id: 'tab-' + Date.now(),
      title: nome
    };

    tabs.push(novaAba);
    activeTabId = novaAba.id; // Ativa a aba recém-criada
    salvarAbas();
    renderizarAbas();
    renderizarQuadro();

    $('#modal-aba').removeClass('active');
  });
}

// ============================================================================
// GERENCIAMENTO DE MODAIS E FORMULÁRIOS
// ============================================================================
function configurarEventosUI() {
  // Botão "+ Nova Tarefa"
  $('#btn-nova-tarefa').on('click', function () {
    abrirModalCriacao();
  });

  // Fechar Modal de Tarefa
  $('#btn-fechar-modal-tarefa, #btn-cancelar-tarefa').on('click', function () {
    $('#modal-tarefa').removeClass('active');
  });

  // Submissão do Formulário de Criação/Edição
  $('#form-tarefa').on('submit', function (e) {
    e.preventDefault();
    salvarDadosFormulario();
  });

  // Botões de Ações dos Cartões (Editar, Excluir, Finalizar Rápido)
  $(document).on('click', '.task-btn-action', function () {
    const action = $(this).attr('data-action');
    const taskId = $(this).closest('.task-card').attr('data-id');

    if (action === 'edit') {
      abrirModalEdicao(taskId);
    } else if (action === 'delete') {
      excluirTarefa(taskId);
    } else if (action === 'finish') {
      processarMudancaDeStatus(taskId, 'done');
    }
  });

  // Ações do Modal de Justificativa de Atraso
  $('#btn-confirmar-justificativa').on('click', function () {
    confirmarFinalizacaoComJustificativa();
  });

  $('#btn-cancelar-justificativa').on('click', function () {
    pendingOverdueTask = null;
    $('#modal-justificativa').removeClass('active');
  });
}

/**
 * Abre o modal para cadastro de nova tarefa
 */
function abrirModalCriacao() {
  $('#modal-tarefa-titulo').text('Nova Tarefa');
  $('#tarefa-id').val('');
  $('#tarefa-titulo').val('');
  $('#tarefa-descricao').val('');
  $('#tarefa-categoria').val('Trabalho');

  // Define um prazo padrão de 2 dias no futuro para praticidade
  const dataPadrao = new Date(Date.now() + 48 * 60 * 60 * 1000);
  $('#tarefa-prazo').val(dataPadrao.toISOString().slice(0, 16));

  $('#modal-tarefa').addClass('active');
  $('#tarefa-titulo').focus();
}

/**
 * Abre o modal para edição de tarefa existente
 */
function abrirModalEdicao(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  // Tarefas finalizadas não podem ser editadas
  if (task.status === 'done') {
    alert('Tarefas concluídas não podem ser alteradas.');
    return;
  }

  $('#modal-tarefa-titulo').text('Editar Tarefa');
  $('#tarefa-id').val(task.id);
  $('#tarefa-titulo').val(task.title);
  $('#tarefa-descricao').val(task.description || '');
  $('#tarefa-categoria').val(task.category || 'Geral');
  $('#tarefa-prazo').val(task.deadline || '');

  $('#modal-tarefa').addClass('active');
  $('#tarefa-titulo').focus();
}

/**
 * Salva a inclusão ou alteração dos dados do modal
 */
function salvarDadosFormulario() {
  const id = $('#tarefa-id').val();
  const titulo = $('#tarefa-titulo').val().trim();
  const descricao = $('#tarefa-descricao').val().trim();
  const categoria = $('#tarefa-categoria').val() || 'Geral';
  const prazo = $('#tarefa-prazo').val();

  if (!titulo || !prazo) {
    alert('Por favor, preencha o título e o prazo da tarefa.');
    return;
  }

  if (id) {
    // Modo Edição
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.title = titulo;
      task.description = descricao;
      task.category = categoria;
      task.deadline = prazo;
    }
  } else {
    // Modo Criação
    const novaTarefa = {
      id: 'task-' + Date.now(),
      title: titulo,
      description: descricao,
      category: categoria,
      tabId: activeTabId, // Associa a tarefa à aba ativa atualmente
      deadline: prazo,
      status: 'todo', // Sempre inicia em "A Fazer"
      createdAt: new Date().toISOString(),
      completionNote: null
    };
    tasks.push(novaTarefa);
  }

  salvarTarefas();
  renderizarQuadro();
  $('#modal-tarefa').removeClass('active');
}

/**
 * Exclui uma tarefa mediante confirmação
 */
function excluirTarefa(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  if (confirm(`Deseja realmente excluir a tarefa "${task.title}"?`)) {
    tasks = tasks.filter(t => t.id !== taskId);
    salvarTarefas();
    renderizarQuadro();
  }
}

// ============================================================================
// TRATAMENTO DE TAREFAS VENCIDAS (Justificativa Obrigatória)
// ============================================================================

/**
 * Exibe o diálogo obrigatório para justificar o atraso da tarefa
 */
function abrirModalJustificativa(task) {
  pendingOverdueTask = task;
  $('#justificativa-tarefa-nome').text(`"${task.title}"`);
  $('#justificativa-texto').val('');
  $('#modal-justificativa').addClass('active');
  $('#justificativa-texto').focus();
}

/**
 * Valida se a nota foi preenchida e finaliza a tarefa com a justificativa
 */
function confirmarFinalizacaoComJustificativa() {
  if (!pendingOverdueTask) return;

  const nota = $('#justificativa-texto').val().trim();

  // Validação: a justificativa não pode ser vazia
  if (!nota) {
    alert('Atenção: É obrigatório informar o motivo do atraso para arquivar esta tarefa vencida!');
    $('#justificativa-texto').focus();
    return;
  }

  // Atualiza a tarefa com a justificativa e status 'done'
  pendingOverdueTask.status = 'done';
  pendingOverdueTask.completionNote = nota;

  salvarTarefas();
  renderizarQuadro();

  // Fecha o modal e limpa a variável temporária
  $('#modal-justificativa').removeClass('active');
  pendingOverdueTask = null;
}

// ============================================================================
// FUNÇÃO UTILITÁRIA DE SEGURANÇA
// ============================================================================
/**
 * Evita injeção de código XSS ao renderizar dados inseridos pelo usuário
 */
function escapeHtml(string) {
  if (!string) return '';
  return $('<div>').text(string).html();
}

