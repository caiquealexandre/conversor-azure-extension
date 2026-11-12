# Conversor de Horas — Azure DevOps e ServiceNow (Extensão Chrome/Firefox)

## O que é este projeto

Extensão do Chrome e do Firefox (Manifest V3, popup) que converte horas e minutos
para o formato de lançamento de tempo de dois sistemas, alternados por um switch
no popup (escolha salva em `localStorage`):

- **Azure DevOps**: `horas decimais = horas + (minutos / 60)`, 2 casas, vírgula
  (pt-BR). Atenção: 1h40 = 1,67 — nunca 1,40. Paleta azul.
- **ServiceNow**: entrada em horas decimais (campo único `#horasDecimais`, vírgula
  ou ponto) e saída em duração `HH:MM:SS`, arredondada ao minuto (1,67 = 01:40:00). Paleta verde e branca
  (`body[data-sistema="sn"]` sobrescreve os tokens `--primary*`).

## Estrutura

- `manifest.json` — Manifest V3, só `activeTab`; content scripts para Azure e para `*.service-now.com` (`all_frames`)
- `popup.html` — UI completa com CSS inline no `<style>`; largura fixa de 380px (popups não têm viewport de página)
- `popup.js` — toda a lógica do popup; config por sistema em `SISTEMAS`; JS externo é obrigatório (MV3 proíbe script inline por CSP)
- `content-script.js` — Azure: preenche "Realizado" (`input[id^="__bolt-Realizado-input"]`, o último no DOM = work item da frente) e "Fechar task"
- `content-script-sn.js` — ServiceNow (Tarefa de Scrum `rm_scrum_task`, formulário classic no iframe `gsft_main`): preenche "Duração real" (`ni.rm_scrum_task.work_durationdur_{day,hour,min,sec}` + hidden `rm_scrum_task.work_duration`); "Fechar task" usa `rm_scrum_task.work_start` (fallback `start_date`), formato `dd-MM-yyyy HH:mm:ss`. Só o frame que tem o campo responde à mensagem
- `dist/chrome` e `dist/firefox` — cópias manuais para empacotar; o manifest do Chrome não tem `browser_specific_settings`
- `icons/` — losango azul #0078D4 em 16/48/128px

Existe também uma versão standalone anterior (`index.html` único, responsivo,
com media queries) que deu origem a este projeto — a extensão é a adaptação dela.

## Decisões de design

- Visual Fluent/Azure: fonte Segoe UI, azul primário #0078D4, cinza #F3F2F1 de fundo, cards com sombra sutil, border-radius 4px
- Tabela de referência (5min=0,08 ... 60min=1,00) dentro de `<details>` recolhível para não alongar o popup
- Validações: Azure — horas inteiras ≥ 0, minutos inteiros entre 0 e 59; ServiceNow — decimal ≥ 0 (vírgula ou ponto); campos vazios tratados como 0; mensagens de erro em pt-BR com destaque vermelho no campo inválido
- Conversão automática no evento `input`, além do botão "Converter para horas do Azure"
- Botão copiar usa `navigator.clipboard` com fallback para `execCommand`

## Regras para alterações

- Manter todo o texto da UI em português
- Não adicionar `permissions` ao manifest sem necessidade real — quebra a revisão rápida e a política de propósito único da Web Store
- Não adicionar script inline no HTML (CSP do MV3)
- Manter propósito único: só conversão de horas; funcionalidades não relacionadas devem virar outra extensão

## Como testar

1. `chrome://extensions` → ativar Modo do desenvolvedor
2. "Carregar sem compactação" → selecionar esta pasta
3. Após cada alteração, clicar no botão de recarregar da extensão

## Publicação (Chrome Web Store)

- Zip com os arquivos na raiz (não a pasta dentro do zip): `zip -r conversor-azure.zip manifest.json popup.html popup.js content-script.js content-script-sn.js icons/`
- Dashboard: https://chrome.google.com/webstore/devconsole — taxa única de US$ 5
- Usar e-mail da organização (Rocket IT), não conta pessoal
- Visibilidade "não listada" para uso interno da equipe (compartilhar por link)
- Extensão não coleta dados — declarar isso na aba Privacy
- Atualizações: incrementar `version` no manifest, gerar novo zip, reenviar no mesmo item

## Backlog de ideias

- `chrome.storage.local` para lembrar o último valor convertido
- Atalho de teclado via `"commands"` no manifest para abrir o popup
- Conversão inversa (decimal → horas e minutos)
