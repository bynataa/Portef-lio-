# Renata Guimarães · Renarchi Arquitetura

Portfólio de arquitetura e urbanismo de Renata Guimarães, em português e inglês. Reúne apresentação profissional, áreas de atuação, dez projetos com galerias e canais de contato.

## Recursos

- Navegação PT/EN com preferência de idioma e páginas equivalentes.
- Projetos organizados por categoria, com fotografias, renders, desenhos e créditos.
- Galerias de imagens e pranchas com navegação por teclado, zoom na resolução original e abertura individual.
- Layout responsivo, foco visível e suporte a movimento reduzido.
- Títulos, descrições, prévias de compartilhamento e metadados por idioma.
- Contato direto por e-mail, WhatsApp, Instagram e telefone, com mensagens preparadas por projeto e idioma.
- PDF do portfólio disponível para consulta.

## Executar

Requisitos: Node.js 20 ou superior e Python 3.

```bash
npm ci
npm run build
npm start
```

Abra `http://localhost:4173`. Os arquivos do site são gerados em `dist/`. Encerre o servidor com Ctrl+C.

## Verificar

```bash
npm run check
npm run test:dom
npm run test:contact
npm run test:quote
npm run test:motion
npm run test:carousel
```

As verificações cobrem arquivos, links internos, imagens, traduções, metadados e lógica de navegação. O teste de DOM utiliza simulação; detalhes e limitações estão em [docs/VALIDACAO.md](docs/VALIDACAO.md).

## Identidade visual

A identidade usa creme, areia e café, títulos em Cormorant Garamond (WOFF2 local, licença OFL em `public/assets/fonts`) e imagens originais do portfólio. A abertura usa `cover-ambrosini.webp`, a fachada noturna da Residência Ambrosini; `hero-ambrosini.webp` é a imagem do interior.

As assinaturas vetoriais claras/escuras e PT/EN ficam em `public/assets/brand`. O favicon usa a imagem completa fornecida pela cliente, preservada em `public/assets/brand/renarchi-seal.png`. As referências aos ícones incluem uma versão calculada pelo conteúdo para renovar o cache. Os arquivos SVG, ICO, PNG e Apple Touch são versionados; `scripts/generate-brand.mjs` é uma ferramenta opcional de autoria que requer Sharp e não faz parte do build.

O cabeçalho acompanha a rolagem natural, e a profundidade da imagem é limitada a 12px em desktop. Entradas não ocultam conteúdo antes da inicialização; a preferência por movimento reduzido é respeitada, inclusive quando alterada durante a visita. Os testes de movimento simulam as APIs do navegador. O domínio público é `https://renarchi.com.br`, usado também em canonical, hreflang, sitemap e metadados.

## Atualizar conteúdo

| Conteúdo | Arquivo |
|---|---|
| Nome, endereço do site e contatos | `src/site.json` |
| Interface, menus, botões e serviços PT/EN | `src/ui.json` |
| Perfil, formação, experiência e projetos PT/EN | `src/projects.json` |
| Imagens e pranchas | `public/assets/` |
| Legendas e referências das imagens | `public/assets/assets-manifest.json` |
| Seleção e ordem das imagens de cada projeto | `src/galleries.json` |
| Estilos | `public/styles.css` |
| Idioma, menu, filtros e galeria | `public/app.js` |
| Templates e geração das páginas | `scripts/build.mjs` |

Preencha as versões em português e inglês ao editar conteúdo. Em seguida, execute o build e as verificações. A pasta `dist/` é gerada automaticamente e não deve ser editada manualmente.

Para substituir o PDF:

```bash
node scripts/import-portfolio.mjs caminho/portfolio.pdf
npm run build
```

O manifesto `source-assets/portfolio.json` registra o tamanho e a integridade do documento. A substituição do PDF não altera automaticamente as imagens nem os textos dos projetos; esses conteúdos devem ser atualizados nos arquivos indicados acima.

Para adicionar um projeto, use um objeto de `src/projects.json` como referência, defina um `id` único e preencha os campos nos dois idiomas. Adicione as imagens e as legendas ao manifesto e indique seus identificadores, na ordem desejada, em `src/galleries.json`. As páginas indicadas em `pages` permanecem disponíveis na seção expansível de pranchas.

Prefira fotografias e renders originais à extração do PDF. Aumentar o tamanho de uma imagem pequena não recupera detalhes. O zoom da galeria usa a resolução disponível em cada arquivo.

## Publicação

Em **Settings → Pages → Build and deployment → Source**, selecione **GitHub Actions**. O workflow `.github/workflows/pages.yml` gera e publica o site a cada atualização na branch `main`. Se necessário, execute-o em **Actions → Portfólio · GitHub Pages → Run workflow**.

Os arquivos publicados são gerados em `dist/`. O campo `url` de `src/site.json` deve corresponder ao endereço público para gerar canonical, hreflang, sitemap e prévias de compartilhamento corretamente.

## Formulário de contato

O botão flutuante “Assistente de orçamento” abre um atendimento guiado PT/EN, com opção de mensagem direta; a página de contato também oferece o formulário diretamente. Os pedidos seguem para `renarchi.urb@gmail.com`, definido em `src/site.json`, por meio do FormSubmit. O e-mail do visitante configura o Reply-To para responder pelo Gmail. Em páginas de projeto, a referência acompanha o pedido.

**Ativação única:** após o primeiro envio, abra a mensagem do FormSubmit no e-mail destinatário (verifique também o spam) e confirme a ativação. Até essa confirmação, o recebimento não está habilitado. Faça um envio de teste depois de ativar para conferir a entrega. Não é necessário colocar a senha do Gmail no site.

O formulário informa sucesso apenas após uma resposta positiva do serviço; erros preservam os dados e permitem nova tentativa. O envio depende da disponibilidade do FormSubmit e da ativação do destinatário. O campo `_honey` reduz envios automatizados. Sem JavaScript, a página de contato usa POST nativo, com a confirmação do próprio serviço.

Interface e mensagens: `src/ui.json`. Comportamento: `public/contact.js`. Os testes simulam as respostas do serviço e não comprovam entrega à caixa de entrada.

## Assistente de orçamento

O atendimento usa perguntas guiadas e adapta a pergunta de escopo ao serviço escolhido. Coleta serviço, tipo de imóvel, localização, ideias, área aproximada, prazo, investimento opcional na obra e contatos. O visitante revisa e pode editar as respostas antes de acionar **Enviar pedido por e-mail**. Só essa ação final envia os dados.

As respostas formam um pedido de orçamento completo, enviado pelo mesmo FormSubmit para `src/site.json > email`, com Reply-To do visitante e referência ao projeto quando disponível. O assistente não calcula preços nem promete disponibilidade. Valores e proposta dependem da análise da Renata.

Esta versão é um assistente determinístico, não uma IA generativa. Não usa uma API de modelos nem armazena a conversa no navegador: as respostas permanecem apenas na memória da página e são perdidas ao recarregar ou navegar. Para conversação livre por IA, seria necessário um backend com credenciais protegidas, uma API de modelo e contexto comercial aprovado.

Perguntas, opções e mensagens: `src/ui.json > quoteAssistant`. Fluxo e resumo: `public/quote.js`. A entrega e sua ativação continuam sob as regras do FormSubmit descritas acima. Sem suporte aos recursos necessários, o formulário HTML permanece disponível.

## Créditos

Conteúdo, imagens e informações profissionais de Renata Guimarães. As páginas de projetos preservam os créditos de colaboração e distinguem fotografias, renders e desenhos técnicos.

## Movimento e navegação visual

O cabeçalho usa vidro fosco em tons creme, com fundo opaco como alternativa em navegadores sem `backdrop-filter`. A página inicial apresenta os quatro projetos em destaque em um carrossel nativo, com setas, indicadores, teclado e gesto de deslizar. Sem JavaScript, a seleção continua disponível em grade. O carrossel não avança sozinho.

O efeito de profundidade acompanha a rolagem na fachada de abertura e nas capas fotográficas dos projetos, com deslocamentos limitados. Desenhos técnicos mantêm a exibição integral. A rolagem vertical continua nativa; em telas pequenas ou com preferência por movimento reduzido, o parallax é desativado. `public/carousel.js` contém o carrossel; `public/app.js` controla os movimentos progressivos.
