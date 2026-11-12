const extensionApi = globalThis.browser ?? globalThis.chrome;

const inputHoras = document.getElementById('horas');
const inputMinutos = document.getElementById('minutos');
const inputDecimal = document.getElementById('horasDecimais');
const todosInputs = [inputHoras, inputMinutos, inputDecimal];
const btnConverter = document.getElementById('btnConverter');
const btnFecharTask = document.getElementById('btnFecharTask');
const btnCopiar = document.getElementById('btnCopiar');
const btnAdicionar = document.getElementById('btnAdicionar');
const btnLimpar = document.getElementById('btnLimpar');
const boxErro = document.getElementById('erro');
const boxResultado = document.getElementById('resultado');
const spanValor = document.getElementById('valorDecimal');
const spanCopiado = document.getElementById('copiado');
const titulo = document.getElementById('titulo');
const rotuloResultado = document.getElementById('rotuloResultado');
const radiosSistema = document.querySelectorAll('input[name="sistema"]');

const CHAVE_SISTEMA = 'conversor-horas:sistema';

const pad2 = numero => String(numero).padStart(2, '0');

// Azure: entram horas inteiras + minutos (1h40) e sai o decimal com vírgula (1,67).
function validarHorasMinutos() {
  const horas = inputHoras.value === '' ? 0 : Number(inputHoras.value);
  const minutos = inputMinutos.value === '' ? 0 : Number(inputMinutos.value);

  // type="number" devolve '' para texto inválido ("1e", "-"): não tratar como 0.
  if (inputHoras.validity.badInput || !Number.isInteger(horas)) {
    return { ok: false, campo: inputHoras, mensagem: 'Informe as horas como um número inteiro.' };
  }
  if (horas < 0) {
    return { ok: false, campo: inputHoras, mensagem: 'As horas não podem ser negativas.' };
  }
  if (inputMinutos.validity.badInput || !Number.isInteger(minutos)) {
    return { ok: false, campo: inputMinutos, mensagem: 'Informe os minutos como um número inteiro.' };
  }
  if (minutos < 0 || minutos > 59) {
    return { ok: false, campo: inputMinutos, mensagem: 'Os minutos devem estar entre 0 e 59.' };
  }

  return { ok: true, valor: (horas + (minutos / 60)).toFixed(2).replace('.', ',') };
}

// ServiceNow: entra decimal (1,67) e sai a duração HH:MM:SS (01:40:00),
// arredondada para o minuto mais próximo.
function validarHorasDecimais() {
  const texto = inputDecimal.value.trim();
  const horas = texto === '' ? 0 : Number(texto.replace(',', '.'));

  if (!/^\d*([.,]\d*)?$/.test(texto) || !Number.isFinite(horas)) {
    return { ok: false, campo: inputDecimal, mensagem: 'Informe as horas em decimal, sem negativos (ex.: 1,67).' };
  }

  const totalMinutos = Math.round(horas * 60);
  return { ok: true, valor: `${pad2(Math.floor(totalMinutos / 60))}:${pad2(totalMinutos % 60)}:00` };
}

const SISTEMAS = {
  azure: {
    titulo: 'Conversor de horas — Azure DevOps',
    botaoConverter: 'Converter para horas do Azure',
    rotuloResultado: 'Valor para lançar no Azure DevOps:',
    calcular: validarHorasMinutos,
    campos: [inputHoras, inputMinutos],
    mensagemPreencher: 'PREENCHER_AZURE',
    mensagemFecharTask: 'FECHAR_TASK',
    erroConexao: 'Abra um item do Azure DevOps em dev.azure.com ou visualstudio.com para preencher o campo automaticamente.',
    erroPreencher: 'Não foi possível preencher o campo do Azure DevOps.',
    erroSemResposta: 'A página do Azure não respondeu. Atualize a aba do Azure e tente novamente.',
    erroAcesso: 'Erro ao acessar a página do Azure DevOps.'
  },
  sn: {
    titulo: 'Conversor de horas — ServiceNow',
    botaoConverter: 'Converter para horas do ServiceNow',
    rotuloResultado: 'Valor para lançar no ServiceNow (Duração real):',
    calcular: validarHorasDecimais,
    campos: [inputDecimal],
    mensagemPreencher: 'PREENCHER_SN',
    mensagemFecharTask: 'FECHAR_TASK_SN',
    erroConexao: 'Abra uma Tarefa de Scrum do ServiceNow (service-now.com) para preencher o campo automaticamente.',
    erroPreencher: 'Não foi possível preencher o campo Duração real do ServiceNow.',
    erroSemResposta: 'A página do ServiceNow não respondeu. Abra uma Tarefa de Scrum, atualize a aba e tente novamente.',
    erroAcesso: 'Erro ao acessar a página do ServiceNow.'
  }
};

let sistema = SISTEMAS.azure;
let timerCopiado = null;

function mostrarErro(mensagem) {
  boxErro.textContent = mensagem;
  boxErro.classList.add('show');
}

function converter() {
  const resultado = sistema.calcular();
  todosInputs.forEach(input => input.classList.remove('invalid'));

  if (!resultado.ok) {
    resultado.campo.classList.add('invalid');
    mostrarErro(resultado.mensagem);
    boxResultado.classList.remove('show');
    return false;
  }

  boxErro.classList.remove('show');
  spanValor.textContent = resultado.valor;
  boxResultado.classList.add('show');
  return true;
}

async function copiarResultado() {
  if (!boxResultado.classList.contains('show') && !converter()) return;

  try {
    await navigator.clipboard.writeText(spanValor.textContent);
  } catch {
    const temporario = document.createElement('textarea');
    temporario.value = spanValor.textContent;
    document.body.appendChild(temporario);
    temporario.select();
    document.execCommand('copy');
    temporario.remove();
  }

  spanCopiado.classList.add('show');
  clearTimeout(timerCopiado);
  timerCopiado = setTimeout(() => spanCopiado.classList.remove('show'), 1800);
}

function limpar() {
  todosInputs.forEach(input => {
    input.value = '';
    input.classList.remove('invalid');
  });
  boxErro.classList.remove('show');
  boxResultado.classList.remove('show');
  sistema.campos[0].focus();
  limparCampoDaPagina();
}

// Limpa também o campo de tempo da task aberta (valor vazio no mesmo fluxo de
// "Adicionar"). Fora de uma página do sistema, só o popup é limpo, sem erro.
async function limparCampoDaPagina() {
  try {
    const response = await enviarParaGuiaAtiva({ type: sistema.mensagemPreencher, value: '' });
    if (response && !response.success) mostrarErro(response.error || sistema.erroPreencher);
  } catch {
    // Aba ativa não é do sistema selecionado: nada a limpar na página.
  }
}

function consultarGuias(queryInfo) {
  if (globalThis.browser) return extensionApi.tabs.query(queryInfo);

  return new Promise((resolve, reject) => {
    extensionApi.tabs.query(queryInfo, tabs => {
      const error = extensionApi.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(tabs);
    });
  });
}

function enviarMensagem(tabId, message) {
  // Captura no envio: o usuário pode trocar o sistema antes da resposta chegar.
  const { erroConexao } = sistema;

  if (globalThis.browser) {
    return extensionApi.tabs.sendMessage(tabId, message).catch(() => {
      throw new Error(erroConexao);
    });
  }

  return new Promise((resolve, reject) => {
    extensionApi.tabs.sendMessage(tabId, message, response => {
      if (extensionApi.runtime.lastError) reject(new Error(erroConexao));
      else resolve(response);
    });
  });
}

async function enviarParaGuiaAtiva(message) {
  const [tab] = await consultarGuias({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('Não foi possível identificar a guia ativa.');
  return enviarMensagem(tab.id, message);
}

async function adicionar() {
  // Resultado visível já está em sincronia com os campos (ou veio de "Fechar task"):
  // reconverter campos vazios sobrescreveria esse valor com zero.
  if (!boxResultado.classList.contains('show') && !converter()) return;

  try {
    const response = await enviarParaGuiaAtiva({
      type: sistema.mensagemPreencher,
      value: spanValor.textContent
    });

    if (!response) throw new Error(sistema.erroConexao);
    if (!response.success) throw new Error(response.error || sistema.erroPreencher);
  } catch (error) {
    mostrarErro(error?.message || 'Erro ao enviar dados para a página ativa.');
  }
}

async function fecharTask() {
  boxErro.classList.remove('show');

  try {
    const response = await enviarParaGuiaAtiva({ type: sistema.mensagemFecharTask });

    if (!response) throw new Error(sistema.erroSemResposta);
    if (!response.success) throw new Error(response.error || 'Não foi possível calcular o tempo da task.');

    spanValor.textContent = response.value;
    boxResultado.classList.add('show');
  } catch (error) {
    mostrarErro(error?.message || sistema.erroAcesso);
  }
}

function lerSistemaSalvo() {
  try {
    return localStorage.getItem(CHAVE_SISTEMA);
  } catch {
    return null;
  }
}

function salvarSistema(chave) {
  try {
    localStorage.setItem(CHAVE_SISTEMA, chave);
  } catch {
    // Sem armazenamento disponível: a escolha só vale até fechar o popup.
  }
}

function aplicarSistema(chave) {
  const chaveValida = Object.hasOwn(SISTEMAS, chave ?? '') ? chave : 'azure';
  sistema = SISTEMAS[chaveValida];

  document.body.dataset.sistema = chaveValida;
  radiosSistema.forEach(radio => { radio.checked = radio.value === chaveValida; });
  titulo.textContent = sistema.titulo;
  btnConverter.textContent = sistema.botaoConverter;
  rotuloResultado.textContent = sistema.rotuloResultado;

  boxErro.classList.remove('show');
  todosInputs.forEach(input => input.classList.remove('invalid'));
  // O resultado exibido está no formato do sistema anterior (inclusive o vindo
  // de "Fechar task"); com entrada digitada, reconverte (e revalida) no novo formato.
  if (sistema.campos.some(input => input.value.trim())) {
    converter();
  } else {
    boxResultado.classList.remove('show');
  }
}

radiosSistema.forEach(radio => {
  radio.addEventListener('change', () => {
    if (!radio.checked) return;
    aplicarSistema(radio.value);
    salvarSistema(radio.value);
  });
});

btnConverter.addEventListener('click', converter);
btnFecharTask.addEventListener('click', fecharTask);
btnCopiar.addEventListener('click', copiarResultado);
btnAdicionar.addEventListener('click', adicionar);
btnLimpar.addEventListener('click', limpar);
todosInputs.forEach(input => {
  input.addEventListener('input', converter);
  input.addEventListener('keydown', evento => {
    if (evento.key === 'Enter') converter();
  });
});

aplicarSistema(lerSistemaSalvo());
sistema.campos[0].focus();
