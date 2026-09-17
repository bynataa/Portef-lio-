# Validação técnica

## Verificações executadas

- Geração de 30 páginas de conteúdo em português e inglês e duas páginas de erro traduzidas.
- Verificação de 1.026 referências locais e externas, com existência de arquivos e âncoras nas referências locais.
- Verificação de texto alternativo e dimensões em 148 ocorrências de imagens.
- Equivalência das chaves de tradução PT/EN, dez projetos e cobertura das páginas de projetos do portfólio.
- 66 verificações de DOM e lógica em 30 páginas: filtros, contagens, parâmetros de URL, troca de idioma, persistência e indisponibilidade de armazenamento local, menu, rótulos, fechamento por Escape e navegação das galerias.
- Análise da sintaxe CSS e das regras aplicáveis a 360, 390, 768 e 1440 px, incluindo foco visível e movimento reduzido.
- Abertura e verificação de 91 imagens WebP.
- Recomposição do PDF com tamanho e SHA-256 correspondentes ao documento original: `ad13461630be2bb801314cf1666805d4ac81ece781f493647cc12631f7789d6b`.

As verificações podem ser reproduzidas com:

```bash
npm ci
npm run build
npm run check
npm run test:dom
```

## Alcance e limitações

Os testes de DOM utilizam `linkedom` e Node VM. Navegação, armazenamento, foco e diálogo são simulados. Esses resultados não representam renderização nem comportamento nativo de um navegador.

A abertura da prévia local foi bloqueada pelo navegador disponível. Não foram medidas rolagem horizontal, cortes de texto, desempenho real, Lighthouse ou Core Web Vitals. O foco nativo do diálogo e a apresentação em diferentes tamanhos de tela precisam ser verificados no endereço público.

As URLs de contato foram conferidas nos materiais da profissional. Nenhuma mensagem foi enviada, e o recebimento pelos canais não foi testado. A interface abre os canais diretamente e não exibe confirmação de envio.

## Verificações em navegador

1. Abrir as páginas em 360, 390, 768 e 1440 px e conferir a composição, as imagens e a ausência de rolagem horizontal.
2. Navegar por Tab e Shift+Tab, abrir o menu e conferir os estados de foco.
3. Abrir uma galeria, avançar e voltar por botões e setas, fechar com Escape e conferir o retorno do foco.
4. Alternar PT/EN em cada página, aplicar filtros e verificar a preferência de idioma ao retornar.
5. Conferir textos, contatos e créditos com a profissional.
