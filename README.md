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
```

As verificações cobrem arquivos, links internos, imagens, traduções, metadados e lógica de navegação. O teste de DOM utiliza simulação; detalhes e limitações estão em [docs/VALIDACAO.md](docs/VALIDACAO.md).

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

O botão flutuante “Mensagem / orçamento” abre um formulário PT/EN; a página de contato também oferece o formulário diretamente. Os pedidos seguem para `renarchi.urb@gmail.com`, definido em `src/site.json`, por meio do FormSubmit. O e-mail do visitante configura o Reply-To para responder pelo Gmail. Em páginas de projeto, a referência acompanha o pedido.

**Ativação única:** após o primeiro envio, abra a mensagem do FormSubmit no e-mail destinatário (verifique também o spam) e confirme a ativação. Até essa confirmação, o recebimento não está habilitado. Faça um envio de teste depois de ativar para conferir a entrega. Não é necessário colocar a senha do Gmail no site.

O formulário informa sucesso apenas após uma resposta positiva do serviço; erros preservam os dados e permitem nova tentativa. O envio depende da disponibilidade do FormSubmit e da ativação do destinatário. O campo `_honey` reduz envios automatizados. Sem JavaScript, a página de contato usa POST nativo, com a confirmação do próprio serviço.

Interface e mensagens: `src/ui.json`. Comportamento: `public/contact.js`. Os testes simulam as respostas do serviço e não comprovam entrega à caixa de entrada.

## Créditos

Conteúdo, imagens e informações profissionais de Renata Guimarães. As páginas de projetos preservam os créditos de colaboração e distinguem fotografias, renders e desenhos técnicos.
