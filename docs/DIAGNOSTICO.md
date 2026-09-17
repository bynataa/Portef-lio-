# Auditoria do site e preservação das fontes

Auditoria de leitura em 17/09/2026. Fonte: https://renata-architecture.netlify.app/ e PDF anexo `Renata_Guimaraes_Portfolio_MOYA_PAGINA4_NOVO_LAYOUT.pdf`.

## Acesso e cobertura

- HTML publicado, CSS, JavaScript, favicon, todas as 34 imagens JPG referenciadas e o PDF publicado foram obtidos por HTTP com resposta 200.
- Total: 39 recursos, 9.866.109 bytes. Nenhum recurso referenciado falhou no download.
- A ferramenta de leitura web recusou inicialmente a URL; o acesso HTTP por Python funcionou. A auditoria não depende de resultado de busca.
- Rotas e destinos internos encontrados: `/`, `#home`, `#about`, `#projects`, `#contact`, `/assets/css/styles.css`, `/assets/js/main.js`, `/assets/img/favicon.svg`, `/assets/img/p005.jpg` a `/assets/img/p038.jpg`, `/assets/portfolio.pdf` e fragmentos `#page=5` a `#page=38`.
- Não há outra página HTML vinculada, página de detalhe, busca, filtro ou galeria interativa no site publicado.
- O PDF publicado tem 39 páginas; o anexo tem 40. Todas as páginas do PDF publicado foram extraídas e revistas em pranchas de contato; páginas profissionais e de contatos também foram examinadas ampliadas. O PDF anexo foi comparado por texto e pelas páginas profissionais/contato renderizadas.
- Foram lidos integralmente os três arquivos de código do site. O manifesto `original-site/download-manifest.json` registra URLs, tipos, tamanhos e caminhos baixados; `links-and-forms.json` registra os destinos e os atributos do formulário.
- Esta auditoria não fez envio de formulário, mensagem, login, publicação ou alteração remota. Não confirma recebimento do formulário nem disponibilidade dos perfis sociais externos.

## Diagnóstico do código publicado

| Prioridade | Evidência | Consequência / encaminhamento |
|---|---|---|
| Alta | Últimas regras CSS usam chaves duplas: `.en{{display:inline}}`, `.pt{{display:none}}` e `@media (max-width:900px){{...}}`. | Declarações de idiomas e adaptação móvel malformadas; reescrever CSS válido e validar em navegador. |
| Alta | HTML e JavaScript adotam inglês como padrão (`lang="en"`, `data-lang="en"`, fallback `en`). | Novo requisito exige português inicial. |
| Alta | `setLang` altera apenas `body[data-lang]`, botões e armazenamento local. | `html[lang]`, título, descrição, textos alternativos e rodapé não acompanham a mudança. |
| Alta | 34 cartões repetem “Project / Projeto” e número de página. | Organizar por trabalhos reais e explicar contexto, autoria e soluções; separar páginas de um mesmo trabalho de projetos distintos. |
| Alta | Todos os cartões abrem o mesmo PDF em nova aba. | Criar apresentações detalhadas no próprio site; conservar PDF como documento complementar. |
| Média | Imagens são pranchas completas de 576 × 324 px; CSS impõe 220 px de altura e `object-fit:cover`. | Pequenos textos tornam-se ilegíveis e as pranchas podem ser recortadas. Usar imagens extraídas, visualização ampliada e proporções adequadas. |
| Média | 34 JPGs somam aproximadamente 4,86 MB apesar das pequenas dimensões. | Otimizar imagens e carregar tamanhos proporcionais à exibição. |
| Média | Menu horizontal sem versão móvel específica; contêiner com altura fixa de 64 px. | Navegação móvel requer redesenho e teste real de ausência de corte/rolagem horizontal. |
| Média | Metadados apenas em inglês; sem Open Graph, canonical, relações de idiomas ou dados estruturados. | Gerar metadados específicos por página e idioma, coerentes com a URL final. |
| Média | Todos os `alt` são “Portfolio page N”. | Descrever o conteúdo e traduzir textos de acessibilidade. |
| Média | Scroll suave aplicado por JavaScript sem consultar movimento reduzido; sem atalho de conteúdo ou tratamento explícito do cabeçalho fixo. | Respeitar preferências de movimento, foco e acesso por teclado. |
| Média | Formulário POST com `data-netlify="true"`, sem action própria, feedback próprio ou confirmação de backend. | A marcação indica intenção de Netlify Forms, mas não prova integração ativa. Usar canal confirmado ou validar integração na hospedagem antes de anunciar envio. |
| Baixa | “Calls/iMessage (US)” e rodapé permanecem em inglês. | Centralizar todas as traduções da interface. |

A marcação do formulário contém campos `nome`, `email`, `mensagem` e hidden `form-name=contato`. Apenas nome/e-mail têm `required`. Nenhum envio foi realizado.

## Portfólio: estrutura e agrupamento

| Páginas do PDF publicado e do anexo | Trabalho | Cuidado editorial |
|---|---|---|
| 5–8 | Residência Brito, 2024 | Reforma residencial e fachada; autoria independente declarada. |
| 9–13 | Residência Ambrosini, 2021 | Reforma de interiores e fachada; autoria independente declarada. |
| 14–16 | Cool Barber Shop, 2019 | Interiores comerciais; preservar créditos/marcas incorporados às imagens. |
| 17–21 | Centro Médico Pastore, 2024 | Clínica, documentação e fluxos; “duas unidades” aparece no site, mas não foi comprovado por dois estudos distintos no PDF. Não multiplicar trabalhos sem confirmação. |
| 22–26 | R2S Med, 2025 | Escritório corporativo; legenda da p22 foi copiada do barbeiro; há `Lorem ipsum` na p23. Reescrever sem repetir esses erros. |
| 27–31 | Na Régua / estudo residencial, 2022 | Assistência técnica e projeto, não execução de obra. Legenda de fachada noturna na p27 não corresponde à prancha. |
| 32–33 | Residência Krauzer, Seattle, 2024 | Colaboração de projeto com Huber Architecture; manter autoria coletiva indicada. |
| 34–35 | Residência Stark, Seattle, 2024 | Colaboração de projeto com Huber Architecture; manter autoria coletiva indicada. |
| 36–38 | MAG – Museu Águas da Guanabara, 2017 | Projeto acadêmico conceitual. Texto diz indicado ao prêmio ibero-americano, não vencedor; não transformar indicação em premiação conquistada. |
| 39, somente no anexo | CREA-RJ, reforma do departamento de fiscalização, 2026 | Projeto institucional; atuação como arquiteta via Kingline Engenharia; preservar essa atribuição. |

Projetos e imagens reais devem ser preservados. Não usar foto ilustrativa da capa como obra atribuída sem confirmação. Não inventar datas, áreas, clientes, registros, resultados ou atribuições. Dados de desenho e carimbos técnicos permanecem no PDF original; não reproduzir dados pessoais de terceiros em novos textos sem necessidade.

## Diferenças entre PDF publicado e anexo atual

- As páginas 5–38 têm texto extraído idêntico nos dois documentos. Isso confirma que o núcleo dos nove estudos é compartilhado; não prova identidade binária de todas as imagens.
- O PDF publicado tem 39 páginas, o anexo tem 40; a página de contato final passa de 39 para 40. O anexo inclui uma página 39 adicional de **CREA-RJ – reforma do departamento de fiscalização**, Rio de Janeiro, 2026. Atribuição: arquiteta via Kingline Engenharia; software Revit. A prancha mostra reorganização do sexto andar, divisórias de drywall/vidro, pontos elétricos, novos acabamentos e sinalização institucional. Essa página não existia no portfólio publicado.
- Páginas 2 e 3 do anexo são imagens, sem texto extraível direto; foram lidas visualmente. A ausência de texto na extração não significa ausência de conteúdo.
- Anexo p2: pós-graduação em Engenharia Ambiental na Faculdade Focus, em andamento, 2026, 420 h; graduação em Arquitetura e Urbanismo (Estácio, 2019); Marketing identificado como tecnólogo (2019). A versão antiga apresentava Marketing como bachelor. Usar a descrição atual.
- Anexo p2: curso The Architectural Imagination, HarvardX, 2023; Cambridge English, 2023–2024. A versão antiga menciona Harvard Extension e CELTA; não ampliar a certificação além da descrição atual.
- Anexo p3: CREA-RJ via Kingline Engenharia desde fev/2026, cargo de arquiteta (COFA – departamento de fiscalização), projetos institucionais e reformas. Trabalhar para o CREA não transforma o título profissional em engenheira; as fontes identificam Renata como arquiteta e urbanista.
- Anexo p3: Huber Architecture maio/2024–junho/2026; a versão antiga indicava “presente”. A fonte nova fornece data de encerramento.
- Anexo p3: Casa Carioca 2023–2024, Na Régua 2022–2023 e Centro Médico Pastore jan–abr/2024. São informações profissionais que o site resumia excessivamente.
- Anexo p4 distingue **Renarchi Arquitetura, 2026–presente**, de **trabalhos independentes, 2019–presente**. O PDF publicado dizia Renarchi desde jul/2019. A cronologia nova deve prevalecer.

## Contatos e inconsistências

| Fonte | E-mail | LinkedIn | Outros |
|---|---|---|---|
| Site publicado | `renarchi.urb@gmail.com` | `https://www.linkedin.com/in/renarchi-renata-guimar%C3%A3es` | WhatsApp `https://wa.me/5521995451620`; tel. EUA `+1 332 330 8863`. |
| Anexo p2 | `renata.guimaraes.arq@gmail.com` | `linkedin.com/in/renataguimaraes` | Rio de Janeiro; disponibilidade para oportunidades internacionais. |
| PDF publicado p39 / anexo p40 | `renarchi.urb@gmail.com` | Não indicado | `+55 21 99545-1620`; `+1 332 330 8863`; Instagram `@renarchi.urb`. |

Os telefones coincidem. Há duas versões explícitas de e-mail e de LinkedIn. Decisão editorial para a implementação: manter o e-mail empresarial `renarchi.urb@gmail.com`, confirmado tanto no site quanto na página final do anexo, e omitir o link do LinkedIn da interface até a confirmação do perfil correto. Os dois endereços e os dois perfis ficam documentados aqui para revisão da profissional. Não se deve afirmar que os dois LinkedIns são o mesmo perfil, nem que algum foi verificado como ativo. Não foram enviados contatos.

## Preservar, corrigir, reorganizar e criar

**Preservar:** PDF original/anexo, imagens e créditos, diversidade de trabalhos, atribuições em equipe, contatos documentados e natureza estática leve compatível com Netlify.

**Corrigir:** CSS inválido, idioma inicial, traduções incompletas, legendas erradas, cronologia profissional antiga, projetos genéricos e trechos provisórios.

**Reorganizar:** os nove estudos do PDF publicado e o novo estudo institucional do anexo em páginas com contexto, participação e galeria; início com seleção visual; experiência/formação com leitura própria; serviços apenas derivados de competências documentadas.

**Criar:** navegação móvel e bilíngue real, páginas de projeto, galeria ampliável acessível, filtros se úteis, metadados por página/idioma, organização centralizada de conteúdo e instruções de manutenção.

## Limites dos testes desta auditoria

Executado: requisições HTTP dos recursos internos vinculados; leitura integral do HTML/CSS/JS; inventário de links/formulário; extração das 39 páginas do PDF publicado; revisão visual de todas as páginas em pranchas de contato; revisão ampliada das páginas profissionais/contato e comparação com o anexo.

Não executado nesta auditoria: testes de interação em navegador, medidas Core Web Vitals/Lighthouse, envio de formulário, confirmação de caixa postal, abertura autenticada de redes sociais, verificação externa de diplomas/certificados/registros, vínculo Netlify–GitHub ou publicação. Testes da nova implementação devem ser documentados separadamente por quem os executar.

## Arquivos de preservação

- `docs/site-original.zip`: snapshot das 39 respostas HTTP e manifestos, sem credenciais.
- `analysis/original-site/`: cópia de trabalho descompactada.
- `analysis/original-portfolio-pages.json`: texto por página do PDF publicado.
- `analysis/old-contact-sheet-1.jpg` a `analysis/old-contact-sheet-4.jpg`: pranchas usadas na revisão visual.

O snapshot reproduz os arquivos encontrados, incluindo falhas do código original. Não é uma versão corrigida nem foi publicado.
