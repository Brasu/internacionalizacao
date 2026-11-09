# Internacionalização

Protótipo acadêmico de mobilidade internacional, com a identidade visual do AVA Unifor aprovado no projeto. React + TypeScript + Vite + Tailwind CSS e React Router Data Router. Instituições, convênios, contas e contatos são fictícios.

## Executar

Requer Node.js 20.19+ e npm. As versões instaladas estão registradas no `package-lock.json`. O React Router 7 e o Vitest 4 foram escolhidos por serem compatíveis com esse ambiente.

```sh
npm ci
npm run dev
```

Abra o endereço impresso pelo Vite, normalmente http://127.0.0.1:5173.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
npm run test:e2e
```

Para testes no Firefox e WebKit:

```sh
npx playwright install firefox webkit
TEST_FIREFOX=1 TEST_WEBKIT=1 npm run test:e2e
```

O Playwright usa o Chrome instalado no macOS quando disponível; nos outros ambientes, instale Chromium com `npx playwright install chromium`. O Edge é incluído automaticamente quando o aplicativo estiver instalado no caminho padrão do macOS.

## Contas para validação

| Perfil        | Matrícula ou e-mail | Senha       |
| ------------- | ------------------- | ----------- |
| Aluno — Carol | `2612758`           | `Aluno123!` |
| Aluno — Luiza | `2612759`           | `Aluno123!` |
| DRI           | `dri@exemplo.com`   | `Dri123!`   |

Alunos entram com matrícula; a DRI entra com e-mail. Os botões na tela de login preenchem as credenciais. A senha digitada não é persistida. A sessão é mantida por aba e sobrevive à atualização. Para trocar de perfil, abra o menu da conta no canto superior direito, saia e entre com a outra conta.

Carol demonstra o acompanhamento de uma candidatura existente. Luiza começa com matrícula ativa e sem candidatura. Na página inicial, **Minha candidatura** e **Como se candidatar** aparecem conforme esse estado e nunca juntos. **Iniciar nova candidatura** abre o formulário com **Primeira opção**, **Segunda opção** opcional e confirmação das orientações. As opções devem ser diferentes e compatíveis com o aluno. O semestre é obtido do edital, sem campo no formulário do aluno. Após salvar, as preferências ficam na ordem escolhida no acompanhamento e na área da DRI. A nova conta também fica disponível nas bases já salvas, preservando os cadastros e anexos existentes.

Em **DRI → Edital e inscrições**, configure número, título, semestre de destino, datas de início e fim, orientações, link e publicação do edital. O exemplo inicial fica aberto de 1º de janeiro a 31 de dezembro do ano atual para permitir a demonstração. Para testar o bloqueio, use um período encerrado, futuro ou despublique o edital. A data final inclui todo o dia, no horário de Fortaleza. Somente a DRI altera essas configurações.

Para repetir a criação usando Luiza, use **Restaurar demonstração**, ciente de que essa ação remove os dados e anexos criados no protótipo. A criação aceita um único processo por aluno, valida a elegibilidade e a vigência do convênio, rejeita formulários de editais alterados e preserva uma cópia do edital usado na inscrição. Nenhum intercâmbio é criado automaticamente: a candidatura começa na etapa de documentação.

O menu da conta e a tela de login oferecem **Restaurar demonstração**. A restauração remove a base, os arquivos anexados e a sessão deste aplicativo, preservando a preferência de idioma e os dados de outros aplicativos.

## Organização e fluxo de dados

- `src/app`: composição de dependências, roteamento e tratamento de navegação.
- `src/shared`: componentes visuais, estilos e adaptadores de persistência.
- `src/features`: modelos, fixtures, regras, repositórios, serviços, idiomas e páginas.
- `tests/e2e`: testes com navegador real.

```text
Página / loader / action
          ↓
Serviços: permissões, validações e regras
          ↓
Repositórios assíncronos por domínio
          ↓
Adaptador de persistência
```

O único arquivo que conhece `localStorage` e `sessionStorage` é `src/shared/persistence.ts`. Nenhuma tela, hook, loader ou action lê ou grava diretamente nessas APIs.

Os arquivos binários usam o contrato `ArmazenamentoArquivos`, em `src/shared/file-storage.ts`. O adaptador do navegador guarda os bytes e o tipo em IndexedDB; os metadados ficam na candidatura. O adaptador em memória mantém o mesmo contrato. Os arquivos não são convertidos em texto nem armazenados em `localStorage`.

Os dados são lidos como `unknown` e validados pelo repositório. Uma estrutura inválida gera erro e permite restaurar os exemplos; ela não é sobrescrita silenciosamente. As gravações locais são serializadas para preservar alterações concorrentes dentro da aplicação. Não há sincronização automática entre abas.

### Trocar a persistência

O ponto de montagem está em `src/app/services.ts`:

```ts
export const servicos = criarServicosLocais(criarPersistenciaNavegador());
```

Nos testes:

```ts
const servicos = criarServicosEmMemoria();
```

Para um backend futuro, implemente os contratos `Repositorio<T>`, as operações `candidaturas.atualizarDocumento` e `candidaturas.revisarDocumento`, `ArmazenamentoArquivos`, `PersistenciaSessao` e `RepositorioPreferencias` e conecte-os em uma composição equivalente. Os métodos de domínio já retornam `Promise`, portanto componentes e rotas continuarão consumindo o mesmo formato de dados. A API poderá usar endpoints próprios de alunos, instituições, convênios, documentos e atendimento; não precisará reproduzir chaves do armazenamento do navegador.

A autenticação atual compara duas contas fictícias. Uma autenticação de produção deverá substituir esse serviço e validar permissões também no servidor. Não existe backend HTTP implementado nesta versão.

## Roteamento

A rolagem é controlada em `src/shared/navigation-scroll.tsx`: navegar para outra página abre o conteúdo no topo, voltar/avançar restaura a posição anterior e alterar filtros na mesma página mantém a leitura. As posições são temporárias em memória, sem gravar no armazenamento do navegador.

Em `src/features/pages/layout.tsx`, os menus da conta e da navegação mobile fecham ao clicar ou mover o foco para fora, pressionar Escape ou mudar de página. Escape devolve o foco ao controle de abertura.

A configuração está em `src/app/router.tsx`. Cada área tem layout aninhado e `Outlet`. Os loaders carregam dados antes da tela e as actions processam formulários. Alterações por `fetcher.Form` revalidam os dados da página e do cabeçalho.

Rotas públicas: `/login`, `/acesso-negado` e página de conteúdo inexistente.

Rotas de aluno: `/aluno`, `/aluno/universidades`, `/aluno/universidades/:id`, `/aluno/elegibilidade`, `/aluno/candidatura`, `/aluno/candidatura/nova`, `/aluno/apoio`, `/aluno/avisos`, `/aluno/atendimento` e `/aluno/atendimento/:id`.

Rotas da DRI: `/dri`, `/dri/edital`, `/dri/candidaturas`, `/dri/candidaturas/:id`, `/dri/alunos`, `/dri/alunos/novo`, `/dri/convenios`, `/dri/convenios/novo`, `/dri/convenios/:id/editar`, `/dri/relatorios`, `/dri/avisos`, `/dri/atendimento` e `/dri/atendimento/:id`.

O helper `proteger` converte falta de sessão em redirecionamento ao login e perfil incompatível em acesso negado. Cada serviço também valida identidade e propriedade dos dados. A proteção não depende somente do menu ou do loader pai.

Ao hospedar o build estático, configure o servidor para devolver `index.html` nas rotas da SPA. Assim, atualizar `/aluno/candidatura` não produzirá um 404 do servidor.

## Publicação no GitHub Pages

A demonstração está em https://brasu.github.io/internacionalizacao/.

O workflow `.github/workflows/deploy-pages.yml` executa a cada push na `main` e também pode ser iniciado manualmente em **Actions → Deploy to GitHub Pages → Run workflow**. Ele instala as dependências com `npm ci`, executa lint e testes, compila a aplicação e publica `dist` no GitHub Pages. Uma falha nas verificações impede a publicação da nova versão.

Em **Settings → Pages**, a origem da publicação deve ser **GitHub Actions**. O workflow usa o `GITHUB_TOKEN` automático, sem exigir um token pessoal nos secrets do repositório.

O build recebe o caminho base do Pages e `VITE_ROUTER_MODE=hash`. Nessa hospedagem, as rotas usam `/#/login` e `/#/aluno/candidatura`, permitindo abrir links diretos e atualizar páginas internas. O servidor local continua usando as rotas sem `#`.

Para conferir o mesmo build localmente:

```sh
VITE_ROUTER_MODE=hash npm run build -- --base=/internacionalizacao/
npm run preview
```

Abra http://127.0.0.1:4173/internacionalizacao/.

## Guia de aprendizado por fase

### Fase 0 — Fundação e autenticação

Leia `src/app/router.tsx`, `src/app/routing.ts`, `src/features/pages/auth.tsx` e `src/shared/persistence.ts`.

Experimente acessar `/aluno/candidatura` sem sessão: o aplicativo pede login e retorna à candidatura. Entre como aluno e tente `/dri/convenios`: o acesso é negado. Atualize a página e teste sair pelo menu da conta.

A interface principal está em `src/features/pages/layout.tsx`; os componentes pequenos estão em `src/shared/ui.tsx`. As cores e os componentes estilizados com Tailwind estão em `src/shared/styles.css`.

### Fase 1 — RF001: três idiomas

Leia `src/features/i18n.ts` e o componente `LanguagePicker` em `src/features/pages/layout.tsx`.

```ts
await servicos.preferencias.definirIdioma(idioma);
await i18n.changeLanguage(idioma);
```

A primeira linha persiste a preferência pelo contrato; a segunda atualiza os textos. Experimente PT, EN e ES e depois atualize a página. Nomes próprios e textos livres cadastrados permanecem como informados.

### Fase 2 — RF002: cadastro de intercambistas

Leia `studentAction` em `src/features/pages/admin.tsx` e `validarAluno` em `src/features/rules.ts`.

```ts
await servicos.auth.exigirDri();
await servicos.alunos.criar(dados);
```

A action traduz os campos do formulário para um objeto. O serviço verifica perfil, campos e matrícula duplicada. O repositório persiste. Cadastre um estudante e atualize a listagem. Cadastrar um aluno não cria credenciais de login.

### Fase 3 — RF011: instituições e convênios

Leia os tipos em `src/features/models.ts`, os serviços em `src/features/services.ts` e os formulários em `src/features/pages/agreements.tsx`.

Um convênio referencia uma instituição e um ou mais cursos. País e cidade pertencem à instituição; área de conhecimento pertence ao curso; duração, idioma e vigência pertencem ao convênio. Uma instituição pode ser reutilizada em vários convênios.

```ts
await servicos.convenios.salvar(id, dados);
await servicos.convenios.definirAtivo(id, false);
```

Com `id` indefinido, `salvar` cria. Com um `id`, atualiza. Inativar preserva os vínculos históricos. Somente a DRI pode executar essas operações, inclusive nos serviços.

No formulário de convênio, expanda **Cadastrar ou editar instituição**. O formulário auxiliar é independente e pode criar uma instituição ou alterar uma existente. Ao salvar uma nova instituição, ela fica selecionada no convênio.

O catálogo inicial oferece Lisboa, Madri, Montreal e Porto. Carol verá Lisboa, Madri e Montreal: Porto atende Administração, e a matrícula de Carol nesse curso está inativa. O segundo convênio de Lisboa está inativo.

### Fase 4 — RF003: matrículas e oportunidades

Leia a função `oportunidades` em `src/features/services.ts`.

```ts
convenio.ativo &&
  estaVigente(convenio, agora()) &&
  convenio.cursosIds.some((id) => cursosAtivos.has(id));
```

As três condições precisam ser verdadeiras. Os convênios são agrupados por instituição para não duplicar cartões. A consulta de detalhes aplica a mesma restrição. Experimente acessar `/aluno/universidades/porto`.

### Fase 5 — RF004: filtros

Leia `UniversityFilters` em `src/features/components.tsx` e `universitiesLoader` em `src/features/pages/student.tsx`.

```ts
const parametros = new URL(request.url).searchParams;
```

Os filtros ficam na URL, por exemplo `/aluno/universidades?pais=ES&duracao=12`. Atualizar ou usar voltar/avançar preserva a busca. Área e duração precisam corresponder ao mesmo convênio acessível, e não a convênios independentes da mesma instituição.

O catálogo fica na página **Universidades**. Para alunos sem candidatura, o início apresenta **Como se candidatar**, em `src/features/application-guide.tsx`, com os prazos do edital configurado pela DRI, os documentos e as orientações do flyer fornecido. Os textos estão em `src/features/i18n.ts`; o botão abre o formulário em `src/features/pages/admissions.tsx`.

### Fase 6 — RF005: elegibilidade

Leia `avaliarElegibilidade` em `src/features/rules.ts` e os cenários em `src/features/rules.test.ts`.

```ts
const elegivel = Object.values(criterios).every(Boolean);
```

A função não conhece React nem persistência. Ela exige matrícula ativa, 30% a 70% de conclusão, média mínima de 7 e ausência de reprovações. Os limites são inclusivos. Dados incompletos produzem resultado inconclusivo. A página mostra apenas os cursos com matrícula ativa, avaliando cada vínculo separadamente. Sem matrícula ativa, orienta o aluno a consultar a DRI.

### Fase 7 — RF006: candidatura

Leia `ApplicationCard`, `ApplicationTimeline` e `ApplicationPage`.

```tsx
<ApplicationTimeline atual={candidatura.etapaAtual} />
```

A etapa atual determina os indicadores da linha do tempo. As etapas continuam demonstrativas, sem atualização em tempo real; anexar um documento não avança a etapa nem representa aprovação da DRI. Home e detalhes usam a mesma fonte, preservada quando um convênio é inativado. O RF012 acrescenta os anexos editáveis à candidatura.

### Fase 8 — RF007: relatórios PDF

Leia `src/features/pages/reports.tsx`.

```ts
const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
```

As bibliotecas são carregadas ao exportar. Entre como DRI, filtre os intercâmbios e baixe um PDF. O arquivo usa as mesmas linhas apresentadas na tabela e identifica os dados demonstrativos.

### Fase 9 — RF008: vida acadêmica

Leia `SupportPage` em `src/features/pages/student.tsx`.

O destino da candidatura fornece instituição, cidade e país. A página reúne instituição, calendário, transporte, alimentação e serviços de apoio. As orientações são ilustrativas e não substituem informações reais das instituições.

### Fase 10 — RF009: avisos

Leia `noticesAction` em `src/features/pages/notices.tsx` e `servicos.avisos.marcarComoLido`.

```ts
await servicos.avisos.marcarComoLido(avisoId);
```

A propriedade do aviso é verificada no serviço por perfil e destinatário: `alunoId` para alunos e `usuarioId` para a DRI. Marque um aviso como lido: o contador do cabeçalho é atualizado pela revalidação do router. Atualize a página ou saia e entre novamente para conferir a persistência. Os alunos têm exemplos de documentos, integração, aula, feriado, início de aulas e matrícula.

A DRI encontra o card de avisos ao lado de Convênios no início e acessa a lista completa em `/dri/avisos`, pelo card ou pelo sino. Há três lembretes demonstrativos: atualização dos dados dos convênios, documentos pendentes de análise e revisão de vigências. O card exibe até dois avisos não lidos por ordem de data. A lista mantém os avisos já lidos. Os textos estão disponíveis em português, inglês e espanhol.

Bases locais anteriores recebem os exemplos da DRI sem duplicação, preservando os cadastros, anexos e leituras. Avisos antigos de alunos continuam reconhecidos. Os lembretes são exemplos preparados, sem geração automática a partir das alterações dos convênios ou documentos.

### Fase 11 — RF010: atendimento

Leia `src/features/pages/contact.tsx` e `servicos.atendimento`.

```ts
return repos.solicitacoes.criar({
  alunoId: sessao.alunoId,
  canal: dados.canal,
  assunto: dados.assunto,
  mensagens,
});
```

O aluno vem da sessão. Portal, e-mail e WhatsApp utilizam o mesmo modelo de solicitação. Abra um pedido como aluno, saia, entre como DRI, responda e volte ao aluno para consultar o histórico. Nenhuma mensagem é enviada externamente.

### Fase 12 — RF012: documentos da candidatura

Leia `src/features/application-documents.tsx`, `src/features/documents.ts` e `servicos.documentos`.

```ts
await servicos.documentos.anexar(candidaturaId, 'passport', arquivo);
const { arquivo: conteudo, nome } = await servicos.documentos.baixar(candidaturaId, 'passport');
await servicos.documentos.remover(candidaturaId, 'passport');
```

Cada um dos 11 documentos do flyer tem um campo dedicado. **Selecionar arquivo** prepara um arquivo em memória, sem enviá-lo. O aluno confirma em **Enviar documento**; só então a action valida, salva o conteúdo e atualiza o status. É possível cancelar a seleção, substituir, baixar e remover um arquivo. São aceitos PDF, JPG e PNG de até 5 MB, não vazios. Atualizar a página mantém os envios confirmados e descarta seleções ainda não enviadas.

O serviço verifica a sessão e a propriedade da candidatura antes de cada operação. O repositório atualiza cada documento de forma serializada, preservando envios simultâneos de documentos diferentes. Se a gravação dos metadados falhar, o arquivo novo é removido e o anexo anterior é preservado. Os dois documentos do cenário antigo são migrados para a lista completa sem apagar o recebimento demonstrativo anterior.

Para migrar os arquivos para um backend, substitua o adaptador `ArmazenamentoArquivos` na composição, mantendo `ler`, `gravar`, `remover` e `limpar`. O envio e a revisão neste protótipo são locais ao navegador, compartilhados entre os perfis.

### Fase 13 — RF013: revisão documental pela DRI

Leia `src/features/pages/applications.tsx`, `src/features/document-status.tsx` e `servicos.candidaturas` / `servicos.documentos.revisar`.

```ts
const candidaturas = await servicos.candidaturas.listar();
await servicos.documentos.revisar(candidaturaId, 'passport', anexoId, 'aprovado');
await servicos.documentos.revisar(
  candidaturaId,
  'transcript',
  anexoId,
  'correcao',
  'Envie todas as páginas do histórico, legíveis.',
);
```

A DRI acessa **Candidaturas** pelo menu ou atalho no início. A lista informa aluno, matrícula, destino, período e progresso dos documentos. O detalhe permite visualizar imagens/PDF pelo navegador, baixar o arquivo, aprovar ou pedir correção por documento. A orientação é obrigatória para correção, com limite de 2.000 caracteres. A prévia oferece download quando o navegador não consegue exibir o arquivo.

O aluno acompanha os estados **Pendente**, **Aguardando análise**, **Aprovado** e **Correção solicitada**, com a orientação, responsável e data da revisão. O início resume as pendências. A aprovação documental não conclui a seleção para o intercâmbio nem avança automaticamente as etapas demonstrativas.

Cada revisão guarda o `anexoId`. O repositório compara esse identificador com a versão atual dentro da operação serializada: uma decisão de uma tela antiga é rejeitada se o aluno já substituiu ou removeu o arquivo. Confirmar um reenvio remove a revisão anterior e devolve o documento para análise; apenas selecionar outro arquivo preserva o estado atual.

Rotas da DRI: `/dri/candidaturas` e `/dri/candidaturas/:id`. Os serviços restringem a lista e as decisões à DRI; alunos continuam consultando e alterando somente os próprios anexos. Os dados já existentes continuam disponíveis com a inclusão da área da DRI.

## Validação com professor e stakeholders

O roteiro integrado principal é cadastrar instituição e convênio como DRI, consultar como aluno, alterar o convênio e depois inativá-lo. Ao consultar novamente, a oportunidade muda; a candidatura histórica continua disponível.

A matriz e as evidências técnicas ficam em [VALIDACAO.md](VALIDACAO.md). A meta de 90% de sucesso no cadastro precisa de uma sessão real com a equipe da DRI. As medições locais de desempenho não representam um backend de produção.

## Identidade visual

A aplicação segue o protótipo AVA essencial validado: cabeçalho azul `#0649fa`, navegação horizontal, Roboto, fundo branco e componentes simples. A fonte é distribuída localmente por `@fontsource/roboto`. Os logotipos foram obtidos dos assets públicos de https://unifor.br/o/unifor-theme/images/ e são utilizados como referência institucional do trabalho acadêmico.
