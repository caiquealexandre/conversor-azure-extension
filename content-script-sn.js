// Roda em todos os frames do ServiceNow (all_frames): o formulário classic da
// Tarefa de Scrum fica no iframe gsft_main dentro do shell do Next Experience.
// Só o frame que contém o campo Duração real responde; os demais ficam calados
// para não responder "não encontrado" antes do iframe certo.
(() => {
  const extensionApi = globalThis.browser ?? globalThis.chrome;

  const CAMPO_DURACAO = 'rm_scrum_task.work_duration';
  const CAMPOS_INICIO = ['rm_scrum_task.work_start', 'rm_scrum_task.start_date'];

  const pad2 = numero => String(numero).padStart(2, '0');

  extensionApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'PREENCHER_SN' && message?.type !== 'FECHAR_TASK_SN') return false;
    if (!document.getElementById(CAMPO_DURACAO)) return false;

    try {
      if (message.type === 'PREENCHER_SN') sendResponse(preencherDuracao(message.value));
      else sendResponse(fecharTask());
    } catch (error) {
      sendResponse({
        success: false,
        error: `Erro ao acessar o formulário do ServiceNow: ${error?.message || 'erro desconhecido'}`
      });
    }
    return false;
  });

  function definirValor(elemento, valor) {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (valueSetter) valueSetter.call(elemento, valor);
    else elemento.value = valor;

    ['input', 'change', 'blur'].forEach(tipo => {
      elemento.dispatchEvent(new Event(tipo, { bubbles: true }));
    });
  }

  // Converte "HH:MM:SS" nos textos do widget e do hidden; valor vazio limpa o campo.
  function textosDuracao(valor) {
    const texto = valor?.trim() ?? '';
    if (!texto) return { day: '', hour: '', min: '', sec: '', oculto: '' };

    const partes = /^(\d+):([0-5]\d):([0-5]\d)$/.exec(texto);
    if (!partes) return null;

    const [, textoHoras, min, sec] = partes;
    const totalHoras = Number(textoHoras);
    const dias = Math.floor(totalHoras / 24);
    const hour = pad2(totalHoras % 24);
    const hhmmss = `${hour}:${min}:${sec}`;
    return { day: String(dias), hour, min, sec, oculto: dias > 0 ? `${dias} ${hhmmss}` : hhmmss };
  }

  function preencherDuracao(valor) {
    const textos = textosDuracao(valor);
    if (!textos) return { success: false, error: `Valor de duração inválido: ${valor}` };

    const prefixo = `ni.${CAMPO_DURACAO}dur_`;
    const camposVisiveis = ['day', 'hour', 'min', 'sec']
      .map(sufixo => ({ input: document.getElementById(prefixo + sufixo), texto: textos[sufixo] }));

    if (camposVisiveis.some(({ input }) => !input)) {
      return { success: false, error: 'Campo Duração real do ServiceNow não encontrado.' };
    }
    if (camposVisiveis.some(({ input }) => input.disabled || input.readOnly)) {
      return { success: false, error: 'O campo Duração real está bloqueado para edição nesta task.' };
    }

    camposVisiveis.forEach(({ input, texto }) => definirValor(input, texto));

    // Mantém o hidden coerente caso o widget não o recalcule a partir dos inputs visíveis.
    definirValor(document.getElementById(CAMPO_DURACAO), textos.oculto);

    camposVisiveis[1].input.focus();
    return { success: true };
  }

  function converterDataInicio(valor) {
    const texto = valor?.trim();
    if (!texto) return NaN;

    // Formato do usuário no SN: dd-MM-yyyy HH:mm:ss (aceita também dd/MM/yyyy
    // e o padrão do sistema yyyy-MM-dd).
    const hora = '(?:[,\\sT]+(\\d{1,2}):(\\d{2})(?::(\\d{2}))?)?$';
    const dmy = texto.match(new RegExp(`^(\\d{1,2})[-/](\\d{1,2})[-/](\\d{4})${hora}`));
    const ymd = dmy ? null : texto.match(new RegExp(`^(\\d{4})[-/](\\d{1,2})[-/](\\d{1,2})${hora}`));
    if (!dmy && !ymd) return NaN;

    const numeros = (dmy ?? ymd).slice(1).map(parte => Number(parte ?? 0));
    const [dia, mes, ano] = dmy ? numeros.slice(0, 3) : numeros.slice(0, 3).reverse();
    const [horaNum, minuto, segundo] = numeros.slice(3);
    const data = new Date(ano, mes - 1, dia, horaNum, minuto, segundo);

    const dataValida = data.getFullYear() === ano &&
      data.getMonth() === mes - 1 &&
      data.getDate() === dia;
    return dataValida ? data.getTime() : NaN;
  }

  // O atributo timeago traz o valor interno em UTC ("yyyy-MM-dd HH:mm:ss"). O texto
  // exibido está no fuso do perfil do SN, que pode diferir do fuso do PC.
  function inicioUtc(id) {
    const timeago = document.getElementById(`${id}.timeago`)?.getAttribute('timeago') ??
      document.getElementById(id)?.getAttribute('timeago');
    const partes = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(timeago?.trim() ?? '');
    if (!partes) return NaN;

    const [ano, mes, dia, hora, minuto, segundo] = partes.slice(1).map(Number);
    return Date.UTC(ano, mes - 1, dia, hora, minuto, segundo);
  }

  function fecharTask() {
    const campoInicio = CAMPOS_INICIO
      .map(id => document.getElementById(id))
      .find(campo => campo?.value?.trim());
    if (!campoInicio) {
      return { success: false, error: 'Data de início da task não encontrada no ServiceNow.' };
    }

    const utc = inicioUtc(campoInicio.id);
    const dataInicio = Number.isFinite(utc) ? utc : converterDataInicio(campoInicio.value);
    const agora = Date.now();
    // Tolera até 1 min de diferença entre o relógio do PC e o do servidor.
    if (!Number.isFinite(dataInicio) || dataInicio > agora + 60_000) {
      return { success: false, error: 'A data de início da task é inválida.' };
    }

    const totalSegundos = Math.max(0, Math.floor((agora - dataInicio) / 1000));
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;
    const valor = `${pad2(horas)}:${pad2(minutos)}:${pad2(segundos)}`;

    const resposta = preencherDuracao(valor);
    return resposta.success ? { success: true, value: valor } : resposta;
  }
})();
