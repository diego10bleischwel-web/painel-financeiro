# Controle de Criativos

Controle em HTML para GitHub Pages, no estilo do `painel-financeiro`, com quadro tipo Trello, clientes separados, cards de criativos, planejador em calendario e sincronizacao online via Google Sheets + Apps Script.

## Arquivos

- `index.html`: aplicacao inteira, pronta para GitHub Pages.
- `apps-script.gs`: backend do Google Apps Script, salvando o JSON na aba oculta `state`.

## Uso

- Primeira tela: estilo Trello, com areas de trabalho e quadros de clientes.
- Area de trabalho: mostra dashboard geral, calendario geral por semana ou mes, e filtro por cliente/quadro.
- Quadro do cliente: mostra somente os lancamentos e cards daquele cliente, com calendario semanal e colunas tipo Trello.
- Em cada criativo, cole o link do anuncio rodando. Links do Instagram/Reels tentam abrir preview automatico por embed; se alguma rede bloquear, use uma URL direta da midia ou thumbnail.
- Cards aceitam post publicado ou darkpost, link do criativo postado, upload/URL de capa, video Story e video Reels.
- No calendario ou dashboard, clique duas vezes em um criativo para alternar entre rodando e inativo. Marcar como subido salva a data no historico.
- Use o botao de tema para alternar entre visual claro e escuro.

## Configurar sync

1. Crie uma planilha no Google Sheets.
2. Abra `Extensoes > Apps Script`.
3. Cole o conteudo de `apps-script.gs`.
4. Publique em `Implantar > Nova implantacao > App da Web`.
5. Use acesso como voce e permita acesso para qualquer pessoa com o link.
6. Copie a URL `/exec`.
7. No app, clique em `Sync` e cole a URL.

Depois disso, o painel salva no navegador a cada alteracao, marca `Sync pendente` e tenta enviar automaticamente para a nuvem. A cada 5 segundos ele envia pendencias locais ou busca atualizacoes do Google Sheets.

O botao de sync mostra estados como `Sync local`, `Sync conectando...`, `Sync baixando...`, `Sync salvando...`, `Sync salvo HH:MM`, `Sync enviado HH:MM`, `Sync pendente` e `Sync erro`.

Antes de aplicar dados vindos da nuvem, o app salva um backup local em `criativosCloudBackup.v1`. Se houver sync pendente e o usuario tentar fechar a pagina, o navegador mostra um aviso.

Sempre que alterar `apps-script.gs`, publique uma nova implantacao do Web App no Apps Script e use a URL `/exec` atualizada no botao `Sync`.
