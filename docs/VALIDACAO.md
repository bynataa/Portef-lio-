# Validação — 17 de setembro de 2026

## Executado

- Leitura das 40 páginas do PDF anexado, extração de texto e revisão visual das páginas renderizadas.
- Leitura do HTML, CSS e JavaScript do site anterior, inspeção de sua página no navegador e clique no seletor PT. Confirmada exibição simultânea dos dois idiomas.
- Preservação de 39 recursos do site anterior, com respostas HTTP bem-sucedidas; ZIP de origem verificado.
- `npm run build`: 30 páginas de conteúdo + 2 páginas 404, metadados e assets.
- `npm run check`: **1.026 referências locais/externas examinadas**, com existência e âncoras verificadas nas referências locais; **148 ocorrências de imagens** com texto alternativo e dimensões; 10 projetos; cobertura exata das 35 páginas de projetos (5–39); chaves PT/EN equivalentes. URLs externas foram conferidas contra as fontes, não houve submissão ou comprovação de entrega.
- `npm run test:dom`: **66/66 verificações passaram**, em 30 páginas. Testes reproduzíveis com linkedom e Node VM. Filtros/contagens/query, rotas equivalentes, preferência e falha de localStorage, menus/rótulos/Escape e lógica de navegação de 20 galerias.
- Parser CSS e avaliação estática das regras para 360, 390, 768 e 1440 px; estados de foco e movimento reduzido presentes.
- Todos os 91 WebP abertos e validados; capas e heroes inspecionados. Recursos derivados do PDF, sem fotos de banco ou geração artificial.
- PDF recomposto com tamanho e SHA-256 iguais ao original: `ad13461630be2bb801314cf1666805d4ac81ece781f493647cc12631f7789d6b`.

## Limites importantes

A prévia da implementação local foi bloqueada pelo navegador disponível. Portanto, **não foi executada validação visual da nova interface em um navegador real**, nem medição real de overflow, viewport, Lighthouse/Core Web Vitals ou teste do comportamento nativo de foco do `dialog`. Os testes de DOM usam simulação, inclusive do diálogo; não devem ser apresentados como testes de navegador.

O site anterior foi visualmente inspecionado no navegador. Isso não valida a aparência da versão nova.

Nenhuma mensagem de contato foi enviada. O novo site abre canais diretos e não simula envio. A existência dos contatos está documentada nas fontes; disponibilidade dos canais e recebimento não foram testados.

Nenhuma integração Netlify, publicação em produção ou alteração no domínio foi feita. O repositório estava vazio; a branch principal recebeu somente README inicial, e a implementação está na branch de revisão.

## Antes de produção

1. Abrir um Deploy Preview do Netlify e revisar a composição em 360, 390, 768 e 1440 px.
2. Verificar rolagem horizontal, nitidez das imagens, menu e foco por Tab/Shift+Tab.
3. Abrir uma galeria, navegar por setas, fechar com Escape e conferir retorno do foco.
4. Alternar PT/EN nos projetos, aplicar filtros e retornar à página inicial após selecionar EN.
5. Conferir textos e créditos com Renata; confirmar o e-mail empresarial e qual LinkedIn usar. O LinkedIn permanece omitido por divergência entre fontes.
6. Obter aprovação explícita antes do merge/publicação.

O PDF original mantém suas páginas, idiomas, marcas e eventuais inconsistências editoriais. Os textos web foram reescritos com base nos fatos verificados; fotografias e renders preservam seus limites de resolução.
