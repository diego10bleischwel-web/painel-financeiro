# Controle de Criativos

Controle em HTML para GitHub Pages, no estilo do `painel-financeiro`, com quadro tipo Trello, clientes separados, cards de criativos, planejador em calendario e sincronizacao online via Google Sheets + Apps Script.

## Arquivos

- `index.html`: aplicacao inteira, pronta para GitHub Pages.
- `apps-script.gs`: backend do Google Apps Script, salvando o JSON na aba oculta `state`.

## Uso

- `Quadro`: clientes separados, colunas horizontais e cards arrastaveis.
- `Planejador`: calendario mensal com tarefas por dia.
- `Clientes`: cria e edita quadros separados por cliente.
- Em cada criativo, cole o link do anuncio rodando. Para mostrar imagem/video dentro do card, cole tambem uma URL direta da midia ou thumbnail.

## Configurar sync

1. Crie uma planilha no Google Sheets.
2. Abra `Extensoes > Apps Script`.
3. Cole o conteudo de `apps-script.gs`.
4. Publique em `Implantar > Nova implantacao > App da Web`.
5. Use acesso como voce e permita acesso para qualquer pessoa com o link.
6. Copie a URL `/exec`.
7. No app, clique em `Sync` e cole a URL.

Depois disso, o botao mostra `Sync salvo HH:MM` quando salvar, e `Sync pendente` quando houver alteracoes ainda nao enviadas.
