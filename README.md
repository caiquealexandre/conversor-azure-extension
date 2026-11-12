# Conversor de Horas - Azure DevOps e ServiceNow

Extensão de navegador que converte **horas e minutos** para o formato usado nos
lançamentos de tempo de cada sistema. Um switch no topo do popup alterna entre
os modos (a escolha fica salva):

| Modo | Você digita | Resultado (1h40) | Cor |
| --- | --- | --- | --- |
| **Azure DevOps** | horas e minutos (`1` e `40`) | decimal **1,67** (nunca 1,40) | azul |
| **ServiceNow** | horas decimais (`1,67`) | duração **01:40:00** | verde |

<p align="center">
  <img src="docs/popup.png" alt="Popup da extensão Conversor de horas — Azure DevOps" width="360">
</p>

---

## Instalação no Google Chrome

A extensão ainda não está publicada na Web Store — a instalação é feita
manualmente ("sem compactação"). Leva menos de um minuto.

1. Baixe ou clone esta pasta para o seu computador.
2. Abra o Chrome e acesse `chrome://extensions` na barra de endereço.
3. Ative o **Modo do desenvolvedor** no canto superior direito.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta do projeto (a que contém o arquivo `manifest.json`).
6. Pronto! O ícone (losango azul) aparece na barra de extensões. Clique nele
   para abrir o conversor.

> 💡 Fixe o ícone: clique no quebra-cabeça 🧩 na barra do Chrome e no alfinete
> ao lado de "Conversor de Horas".

**Para atualizar após mudanças:** volte em `chrome://extensions` e clique no
botão de recarregar (⟳) no card da extensão.

O mesmo procedimento vale para navegadores baseados em Chromium — **Microsoft
Edge** (`edge://extensions`), **Brave** (`brave://extensions`) e **Opera**.

---

## Instalação no Mozilla Firefox

No Firefox a extensão é carregada como **complemento temporário** — ela funciona
normalmente, mas é removida quando o navegador é fechado. Basta repetir o
processo na próxima vez que precisar.

1. Baixe ou clone esta pasta para o seu computador.
2. Abra o Firefox e acesse `about:debugging` na barra de endereço.
3. No menu à esquerda, clique em **Este Firefox** (*This Firefox*).
4. Clique em **Carregar complemento temporário…** (*Load Temporary Add-on…*).
5. Navegue até a pasta do projeto e selecione o arquivo **`manifest.json`**.
6. Pronto! O ícone aparece na barra de ferramentas. Clique nele para abrir o
   conversor.

**Para atualizar após mudanças:** na mesma tela `about:debugging`, clique em
**Recarregar** (*Reload*) no card da extensão.

> ⚠️ Complementos temporários somem ao reiniciar o Firefox. Para uma instalação
> permanente é necessário empacotar e assinar a extensão pela
> [Mozilla Add-ons (AMO)](https://addons.mozilla.org/developers/) — ainda não
> feito neste projeto.

---

## Como usar

1. Clique no ícone da extensão e escolha **Azure DevOps** ou **ServiceNow** no switch.
2. Digite o tempo trabalhado:
   - **Azure:** **horas** e **minutos** (ex.: `1` e `40` → `1,67`);
   - **ServiceNow:** **horas em decimal**, com vírgula ou ponto (ex.: `1,67` →
     `01:40:00`; o valor é arredondado para o minuto mais próximo).
3. O valor convertido aparece automaticamente.
4. Leve o resultado ao sistema de uma destas formas:
   - **Copiar** — copia o valor decimal para a área de transferência e você cola
     manualmente no campo desejado.
   - **Adicionar automaticamente** — veja abaixo.
   - **Limpar** — zera os campos do popup e também apaga o campo de tempo da
     task aberta (Realizado no Azure / Duração real no ServiceNow). Fora de uma
     task, limpa só o popup.

Há também uma **tabela de referência** recolhível (5min = 0,08 … 60min = 1,00)
dentro do popup.

### Adicionar automaticamente ao Azure

Se você estiver com o **item do Azure DevOps aberto** (aquele em que a hora deve
ser lançada):

1. Preencha os campos de **Horas** e **Minutos** no popup.
2. Clique em **Adicionar automaticamente**.
3. A extensão insere o valor decimal diretamente no campo **Horas Realizadas
   (Completed Work)** do item — sem precisar copiar e colar.

**Fechar task** calcula o tempo desde a data de início da task até agora e
preenche o mesmo campo.

### Adicionar automaticamente ao ServiceNow

Com uma **Tarefa de Scrum** (`STSK…`) aberta em `*.service-now.com` e o modo
**ServiceNow** selecionado:

- **Adicionar automaticamente** preenche o campo **Duração real** (dias, horas,
  minutos e segundos; acima de 24h o excedente vai para dias).
- **Fechar task** calcula o tempo desde a **Data de início real** (ou a data de
  início planejada, se a real estiver vazia) até agora e preenche a Duração real.

Depois é só salvar a task no ServiceNow.

---

## Versão standalone (sem instalar)

O arquivo [`index.html`](index.html) é uma versão avulsa do conversor. Basta
abri-lo no navegador (duplo clique) — não requer instalação de extensão.

---

## Solução de problemas

| Problema | Solução |
| --- | --- |
| "Manifest não encontrado" | Selecione a pasta que contém o `manifest.json` (Chrome) ou o próprio arquivo `manifest.json` (Firefox). |
| Ícone não aparece | Verifique se a pasta `icons/` está junto do `manifest.json`. |
| Mudanças não refletem | Recarregue a extensão (⟳ no Chrome / Reload no Firefox). |
| Extensão sumiu no Firefox | É esperado após reiniciar — recarregue como complemento temporário. |
