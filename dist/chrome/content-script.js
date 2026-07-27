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

function preencherRealizado(value, sendResponse) {
  const inputAzure = document.querySelector('#__bolt-Realizado-input');
  if (!inputAzure) {
    sendResponse({ success: false, error: 'Campo Realizado do Azure DevOps não encontrado.' });
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

function encontrarCampoPrazo() {
  const campoPrazo = document.querySelector('#Prazo-input input');
  if (campoPrazo) return campoPrazo;

  const campoPorNome = document.querySelector([
    'input[aria-label*="prazo" i]',
    'input[aria-label*="due date" i]'
  ].join(','));
  if (campoPorNome) return campoPorNome;

  const label = Array.from(document.querySelectorAll('label')).find(elemento => {
    const texto = elemento.textContent?.trim().toLocaleLowerCase();
    return texto?.includes('prazo') || texto?.includes('due date');
  });

  return label?.htmlFor ? document.getElementById(label.htmlFor) : null;
}

function converterPrazo(value) {
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
  const campoPrazo = encontrarCampoPrazo();
  if (!campoPrazo) {
    sendResponse({ success: false, error: 'Campo Prazo da task não encontrado.' });
    return;
  }

  const prazo = converterPrazo(campoPrazo.value);
  const dataFim = Date.now();
  if (!Number.isFinite(prazo) || prazo > dataFim) {
    sendResponse({ success: false, error: 'O Prazo da task é inválido.' });
    return;
  }

  const resultado = ((dataFim - prazo) / 3_600_000)
    .toFixed(2)
    .replace('.', ',');

  preencherRealizado(resultado, response => {
    sendResponse(response.success ? { success: true, value: resultado } : response);
  });
}
