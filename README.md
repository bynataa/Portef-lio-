# Renata Guimarães · Renarchi Arquitetura

Reformulação completa do portfólio de Renata Guimarães. Site estático em português e inglês, preparado para o Netlify existente. **Esta branch é uma proposta de revisão; não foi publicada em produção.**

## O que está pronto

- 30 páginas de conteúdo: início, projetos, sobre, atuação, contato e 10 estudos de projeto, em PT e EN; mais 2 páginas de erro traduzidas.
- Português inicial, seletor PT/EN em todas as páginas, preferência local persistida, rotas equivalentes, filtros preservados ao trocar de idioma.
- Galerias com navegação por botões e teclado, fechamento por Escape e retorno de foco.
- Imagens reais extraídas do portfólio, com versões WebP e miniaturas. PDF de 40 páginas preservado sem alterações.
- Layout para celular, tablet e computador, foco visível, dimensões explícitas de imagens e preferência por movimento reduzido.
- Títulos, descrições, Open Graph, dados estruturados, canonical, hreflang, robots e sitemap.
- Contato direto por e-mail, WhatsApp, Instagram e telefone, sem formulário com envio simulado.

## Abrir no computador

Instale **Node.js 20 ou superior**. Para o servidor de desenvolvimento abaixo, use Python 3.

```bash
npm ci
npm run build
npm start
```

Abra `http://localhost:4173`. Encerre com Ctrl+C. O resultado pronto fica em `dist/`. Também é possível abrir `dist/index.html` diretamente; persistência de preferência pode variar em URLs de arquivo, por isso prefira HTTP.

O site entregue não carrega bibliotecas externas. As duas dependências de desenvolvimento são usadas apenas na validação.

## Verificar

```bash
npm run build
npm run check
npm run test:dom
```

`check` verifica rotas, imagens, anchors, conteúdo, metadados e equivalência de chaves. `test:dom` usa um DOM simulado para testar a lógica; não substitui uma revisão em navegador. Veja `docs/VALIDACAO.md` para escopo, resultados e limitações reais.

## Publicar no Netlify — somente após aprovação

O site atual permanece intocado. Não existe integração de publicação criada por esta proposta.

1. Revise esta branch e confirme os contatos da profissional.
2. No projeto Netlify existente, confira a associação com este repositório e qual branch está configurada como produção. Não altere a branch de produção antes da aprovação.
3. Para revisão, use um **Deploy Preview** associado ao pull request, se a integração Netlify estiver habilitada. Revise os dez projetos, os dois idiomas e telas de 360, 390, 768 e 1440 px.
4. Após aprovação explícita, faça merge da proposta e configure `npm run build` como comando e `dist` como pasta publicada. O arquivo `netlify.toml` já declara essas opções.
5. Alternativa após aprovação: envie somente o conteúdo de `dist/` pelo deploy manual do Netlify.
6. Se mudar de domínio, atualize `url` em `src/site.json` e gere novamente para corrigir canonical, sitemap, hreflang e previews.

O funcionamento do formulário antigo do Netlify não foi confirmado; o novo site usa contatos diretos e não depende de backend. Nenhuma mensagem foi enviada durante o trabalho.

## Atualizar conteúdo

| Alteração | Arquivo |
|---|---|
| Nome, domínio, e-mail e redes | `src/site.json` |
| Menus, botões, serviços e interface PT/EN | `src/ui.json` |
| Perfil, formação, experiência e projetos PT/EN | `src/projects.json` |
| Imagens, pranchas e PDF | `public/assets/` |
| Legendas, medidas e referência das imagens | `public/assets/assets-manifest.json` |
| Layout e estilos | `public/styles.css` |
| Menu, filtro, idioma e galeria | `public/app.js` |
| Templates e geração de páginas | `scripts/build.mjs` |

Após editar, execute `npm run build` e as verificações. Não edite `dist/` diretamente: a pasta é recriada no build.

### Atualizar o PDF

O original foi dividido em partes binárias por causa do limite de tamanho do conector. O build recompõe o PDF **byte a byte**, conferindo tamanho e SHA-256. Para trocar o documento:

```bash
node scripts/import-portfolio.mjs caminho/novo-portfolio.pdf
```

Depois revise extração de imagens, páginas, descrições e a cobertura esperada nos testes. `source-assets/portfolio.json` contém o manifesto de integridade. Não edite manualmente as partes.

### Adicionar um projeto

Duplique um objeto em `src/projects.json`, crie um `id` único e preencha **as duas línguas** em `title`, `location`, `summary`, `context`, `role`, `credits` e `solutions`. Defina categoria, ano real, ferramentas e páginas da fonte. Adicione capa e legendas no manifesto de imagens; revise os mapeamentos `assetId` e `extraMap` no gerador. Se a fonte passar a ter outro número de páginas/projetos, atualize a cobertura esperada em `scripts/check.mjs`.

A extração atual pode ser reproduzida com `python scripts/extract-assets.py caminho/portfolio.pdf` (PyMuPDF e Pillow). Esse script usa referências específicas do PDF entregue; PDFs novos exigem revisão das páginas e recortes. Não execute sobre um PDF diferente sem ajustar esses mapeamentos.

## Fontes e decisões editoriais

Fonte principal: `Renata_Guimaraes_Portfolio_MOYA_PAGINA4_NOVO_LAYOUT.pdf`, 40 páginas. O site anterior foi preservado em `docs/site-original.zip`; não entra na pasta publicada.

- Profissão: arquiteta e urbanista. CREA-RJ é experiência/projeto via Kingline Engenharia.
- Renarchi fundada em 2026; trabalho independente desde 2019, conforme anexo atualizado.
- Krauzer e Stark preservam colaboração com Huber Architecture.
- Na Régua descreve assistência técnica e projetos, sem atribuir execução de obras.
- MAG é acadêmico; não foi apresentado como vencedor de prêmio.
- E-mail principal: `renarchi.urb@gmail.com`, coincidente no site e no fim do PDF. Há outro e-mail no currículo e dois endereços distintos de LinkedIn nas fontes. LinkedIn foi omitido da interface até confirmação.
- Não foram inventados depoimentos, resultados, clientes ou credenciais. Fotos, renders e pranchas mantêm sua natureza e os créditos disponíveis.
- Algumas legendas incorretas e texto de preenchimento existem no PDF original; foram corrigidos na apresentação web, sem alterar o documento original.

Diagnóstico completo: `docs/DIAGNOSTICO.md`. Leitura por página: `docs/PORTFOLIO.md`.
