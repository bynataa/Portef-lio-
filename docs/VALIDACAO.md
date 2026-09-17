# Validação técnica

## Verificações reproduzíveis

```bash
npm ci
npm run build
npm run check
npm run test:dom
```

O build gera as páginas em português e inglês, duas páginas de erro, sitemap e arquivos estáticos. Também reconstitui o PDF e confere sua integridade contra o manifesto de origem.

`check` verifica referências locais, imagens, metadados, paridade das traduções, seleção das galerias e cobertura das 35 páginas de projetos do portfólio. As dez galerias principais possuem legendas em português e inglês; as pranchas completas permanecem na seção expansível.

`test:dom` executa o JavaScript de produção em uma simulação com `linkedom` e Node VM. A verificação abrange filtros, navegação PT/EN, persistência de idioma, menu, grupos independentes de imagens e pranchas, zoom, abertura do arquivo original, fechamento e retorno de foco. Também confere o número e a mensagem preparada nos links de WhatsApp de cada projeto, sem enviar mensagens.

Os resultados detalhados ficam em `analysis/qa-report.json` e `analysis/qa-report.md`. Defina `QA_REPORT_DIR` para usar outro diretório.

## Limites das verificações automáticas

A simulação não possui mecanismo de renderização, rolagem, foco nativo ou carregamento real de imagens. As regras CSS são analisadas para 360, 390, 768 e 1440 px, mas isso não substitui testes visuais em navegadores e aparelhos.

Os canais de contato foram conferidos nos materiais da profissional. A interface prepara mensagens no aplicativo escolhido; o visitante revisa e envia. O recebimento não faz parte dos testes.

## Conferência em navegador após a publicação

- Verificar a abertura, o menu, o enquadramento das imagens e a legibilidade em computador e celular.
- Alternar PT/EN na mesma página, filtrar projetos e verificar a preferência ao retornar.
- Abrir uma imagem, avançar e voltar por botões e teclado, ampliar, rolar os detalhes, ajustar à tela e fechar com Escape.
- Abrir as pranchas completas e confirmar que sua navegação permanece separada da galeria principal.
- Conferir a abertura do arquivo original e o retorno do foco ao item que abriu a galeria.
- Conferir os links e o texto preparado para contato, sem enviar mensagens de teste à profissional.

## Imagens de origem

O zoom usa os pixels disponíveis no arquivo. O retrato de Renata continua limitado a 282 × 499 px; o layout evita ampliá-lo além dessa largura. Fotografias e renders originais em resolução superior podem substituir as imagens extraídas do PDF, preservando os créditos e as legendas.
