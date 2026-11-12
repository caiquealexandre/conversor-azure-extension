const extensionApi = globalThis.browser ?? globalThis.chrome;

extensionApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'PREENCHER_AZURE') {
    preencherRealizado(message.value, sendResponse);
    return false;
  }

  if (message?.type === 'FECHAR_TASK') {
    try {
      fecharTask(sendResponse);
    } catch (error) {
      sendResponse({
        success: false,
        error: `Erro ao calcular o tempo da task: ${error?.message || 'erro desconhecido'}`
      });
    }
    return false;
  }

  return false;
});

const SELETOR_REALIZADO = 'input[id^="__bolt-Realizado-input"]';

// O Azure permite abrir um work item por cima de outro: os de trás continuam no
// DOM e vêm antes. O da frente é sempre o último renderizado.
function ultimo(raiz, seletor) {
  const elementos = raiz.querySelectorAll(seletor);
  return elementos[elementos.length - 1] ?? null;
}

function preencherRealizado(value, sendResponse, inputAzure = ultimo(document, SELETOR_REALIZADO)) {
  if (!inputAzure) {
    // Limpar (valor vazio) fora de um work item não tem o que apagar: não é erro.
    if (value === '') sendResponse({ success: true });
    else sendResponse({ success: false, error: 'Campo Realizado do Azure DevOps não encontrado.' });
    return;
  }

  // O setter nativo permite que controles gerenciados pelo React percebam a mudança.
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (valueSetter) valueSetter.call(inputAzure, value);
  else inputAzure.value = value;

  inputAzure.dispatchEvent(new Event('input', { bubbles: true }));
  inputAzure.dispatchEvent(new Event('change', { bubbles: true }));
  inputAzure.focus();
  sendResponse({ success: true });
}

function buscarCampoInicio(raiz) {
  const campoPorNome = ultimo(raiz, [
    'input[aria-label*="data de início" i]',
    'input[aria-label*="data de inicio" i]',
    'input[aria-label*="start date" i]'
  ].join(','));
  if (campoPorNome) return campoPorNome;

  const label = Array.from(raiz.querySelectorAll('label')).findLast(elemento => {
    const texto = elemento.textContent?.trim().toLocaleLowerCase();
    return texto?.includes('data de início') ||
      texto?.includes('data de inicio') ||
      texto?.includes('start date');
  });
  return label?.htmlFor ? ultimo(raiz, `[id="${CSS.escape(label.htmlFor)}"]`) : null;
}

// Sobe a partir do Realizado do work item da frente até achar a data de início,
// sem passar do contêiner que já inclui outro work item (o de trás).
function encontrarCampoInicio(realizado) {
  let raiz = realizado;
  while (raiz.parentElement && raiz.parentElement.querySelectorAll(SELETOR_REALIZADO).length === 1) {
    raiz = raiz.parentElement;
    const campo = buscarCampoInicio(raiz);
    if (campo) return campo;
  }

  // Id gerado por contador: último recurso, e só dentro do work item já delimitado.
  return raiz.querySelector('#__bolt-textfield-input-8');
}

function converterDataInicio(value) {
  const texto = value?.trim();
  if (!texto) return NaN;

  // Datas no formato brasileiro não são interpretadas de forma consistente pelo Date.parse.
  const dataBrasileira = texto.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (dataBrasileira) {
    const [, dia, mes, ano, hora = '0', minuto = '0', segundo = '0'] = dataBrasileira;
    const data = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto), Number(segundo));

    if (
      data.getFullYear() === Number(ano) &&
      data.getMonth() === Number(mes) - 1 &&
      data.getDate() === Number(dia)
    ) {
      return data.getTime();
    }
    return NaN;
  }

  return Date.parse(texto);
}

function fecharTask(sendResponse) {
  const realizado = ultimo(document, SELETOR_REALIZADO);
  if (!realizado) {
    sendResponse({ success: false, error: 'Campo Realizado do Azure DevOps não encontrado.' });
    return;
  }

  const campoInicio = encontrarCampoInicio(realizado);
  if (!campoInicio) {
    sendResponse({ success: false, error: 'Campo de data de início da task não encontrado.' });
    return;
  }

  const dataInicio = converterDataInicio(campoInicio.value);
  const dataFim = Date.now();
  if (!Number.isFinite(dataInicio) || dataInicio > dataFim) {
    sendResponse({ success: false, error: 'A data de início da task é inválida.' });
    return;
  }

  const resultado = ((dataFim - dataInicio) / 3_600_000)
    .toFixed(2)
    .replace('.', ',');

  preencherRealizado(resultado, response => {
    sendResponse(response.success ? { success: true, value: resultado } : response);
  }, realizado);
}
