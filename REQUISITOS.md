# Especificação do protótipo Internacionalização

A base são os requisitos da Equipe 5 e a proposta de extensão fornecidas pela família. O RF011 explicita a origem das oportunidades; o RF012 acrescenta o envio de documentos e o RF013, a revisão pela DRI, solicitados durante a construção do protótipo. Esta especificação descreve a implementação demonstrativa; não altera os PDFs originais.

## Requisitos funcionais

| ID    | Objetivo                                                                                                                                      | Validação principal                                                                                                                            |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| RF001 | Disponibilizar português, inglês e espanhol e permitir trocar o idioma.                                                                       | Trocar idioma, atualizar e conferir preferência e textos.                                                                                      |
| RF002 | Permitir que a DRI cadastre intercambistas com nome, matrícula, telefone e e-mail.                                                            | Criar cadastro, persistir e rejeitar matrícula duplicada.                                                                                      |
| RF003 | Identificar matrículas ativas para determinar universidades acessíveis.                                                                       | Excluir cursos inativos e unir oportunidades de cursos ativos.                                                                                 |
| RF004 | Filtrar por país, área de conhecimento e duração.                                                                                             | Combinar filtros preservados na URL sobre o mesmo convênio acessível.                                                                          |
| RF005 | Validar elegibilidade automaticamente.                                                                                                        | Matrícula ativa, 30% a 70% concluído, média ≥ 7 e nenhuma reprovação; dados faltantes são inconclusivos.                                       |
| RF006 | Permitir acompanhar o processo seletivo em tempo real.                                                                                        | O protótipo cobre etapa, pendências e histórico com cenário estático. Tempo real está pendente por decisão de escopo.                          |
| RF007 | Emitir PDF dos intercâmbios em andamento e finalizados.                                                                                       | Filtrar, baixar e abrir o PDF com dados equivalentes à listagem.                                                                               |
| RF008 | Informar instituição, calendário, transporte, alimentação e serviços de apoio.                                                                | Localizar categorias e dados do destino.                                                                                                       |
| RF009 | Exibir avisos acadêmicos aos alunos e lembretes de atualização de convênios e análise documental à DRI.                                       | Card com até dois não lidos, lista completa, leitura persistida, contador e isolamento por destinatário. Os eventos são demonstrativos.        |
| RF010 | Disponibilizar atendimento omnichannel para dúvidas e solicitações.                                                                           | Histórico único de portal, e-mail e WhatsApp simulados; DRI responde e aluno consulta.                                                         |
| RF011 | Permitir à DRI cadastrar, consultar, editar, ativar e inativar convênios, relacionando instituições parceiras aos cursos de origem atendidos. | DRI gerencia, aluno consulta conforme seus vínculos; preservar históricos.                                                                     |
| RF012 | Permitir ao aluno selecionar e confirmar o envio dos documentos da própria candidatura em campos dedicados.                                   | 11 documentos do flyer; seleção sem envio automático; confirmação, substituição, download, remoção e persistência local; PDF/JPG/PNG até 5 MB. |
| RF013 | Permitir à DRI consultar candidaturas e revisar os arquivos enviados, com acompanhamento pelo aluno.                                          | Visualizar e baixar, aprovar ou pedir correção com orientação; reenvio exige nova análise e revisão de versão antiga é rejeitada.              |

## Edital e novas candidaturas

A DRI configura o número, título, semestre de destino, período de inscrições, orientações, link opcional e publicação do edital. O prazo final inclui todo o dia no horário de Fortaleza. O edital demonstrativo inicial permite inscrições durante o ano atual.

Um aluno sem candidatura acessa o formulário com **Primeira opção** e **Segunda opção**, sendo a segunda opcional. Cada opção deve ser compatível, vigente e diferente da outra. O semestre vem do edital, sem campo no formulário. A criação valida a publicação, o prazo, a elegibilidade acadêmica, a vigência do convênio e a confirmação da leitura das orientações. Formulários de um edital alterado são rejeitados. A candidatura começa na documentação com os 11 campos de anexo, preserva o edital de origem e apresenta as preferências na ordem escolhida para aluno e DRI. Um aluno com candidatura acessa seu acompanhamento; não pode abrir outra candidatura simultânea.

## RF013: revisão documental

A DRI lista e abre candidaturas, visualiza e baixa os arquivos enviados, aprova cada documento ou solicita correção com orientação obrigatória. O aluno acompanha a decisão, a orientação, o responsável e a data. Um reenvio exige nova análise; uma revisão de versão antiga é rejeitada. A aprovação documental não equivale à aprovação da seleção de intercâmbio. A revisão usa os mesmos adaptadores de persistência.

## RF011: dados e regras

A instituição possui nome, país e cidade obrigatórios, além de site e contato internacional opcionais. Um cadastro de instituição é compartilhado por vários convênios.

O convênio referencia uma instituição e pelo menos um curso. Possui duração positiva e inteira em meses, idioma de ensino, início e fim de vigência, situação ativa/inativa e observações opcionais. O início não pode ser posterior ao fim.

O país é obtido da instituição e a área de conhecimento do curso. Não são duplicados no convênio. Os cursos são selecionados no catálogo acadêmico demonstrativo.

A oportunidade só aparece quando o convênio está ativo, vigente e atende um curso com matrícula ativa do aluno. Os filtros de área e duração precisam corresponder ao mesmo convênio. A inativação preserva candidaturas e intercâmbios existentes.

## Perfis

| Operação                                   | Aluno                             | DRI                                    |
| ------------------------------------------ | --------------------------------- | -------------------------------------- |
| Consultar oportunidades                    | Apenas dos próprios vínculos      | Gestão pelo catálogo completo          |
| Criar ou alterar instituição               | Não                               | Sim                                    |
| Criar, editar, ativar ou inativar convênio | Não                               | Sim                                    |
| Cadastrar aluno                            | Não                               | Sim                                    |
| Consultar candidatura                      | Somente a própria                 | Todas as candidaturas e documentos     |
| Iniciar candidatura                        | Com elegibilidade e edital aberto | Não                                    |
| Configurar edital e prazos                 | Não                               | Sim                                    |
| Enviar, substituir e remover anexos        | Somente da própria candidatura    | Não                                    |
| Visualizar e baixar anexos                 | Somente da própria candidatura    | Todas as candidaturas                  |
| Aprovar ou pedir correção                  | Não                               | Sim, por documento e versão do arquivo |
| Exportar relatório                         | Não                               | Sim                                    |
| Abrir solicitação                          | Sim, com identidade da sessão     | Consulta e resposta                    |
| Consultar atendimento                      | Somente o próprio                 | Fila completa                          |
| Consultar avisos e marcar como lido        | Somente os próprios               | Somente os destinados à própria conta  |

A interface, os loaders/actions e os serviços aplicam o controle de acesso demonstrativo. Um backend de produção deverá autenticar e autorizar essas operações no servidor.

## Requisitos não funcionais

- RNF001: adaptação a desktop, Android e iOS.
- RNF002: compatibilidade com Chrome, Firefox e Edge recentes.
- RNF003: opções de universidades utilizáveis em menos de 2 segundos.
- RNF004: pelo menos 90% da equipe da DRI deve cadastrar um aluno na primeira tentativa sem erros de navegação.

As evidências e os limites da validação estão em [VALIDACAO.md](VALIDACAO.md).

## Autenticação demonstrativa

Alunos entram com matrícula e senha. A DRI entra com e-mail e senha. A conta de Carol utiliza a matrícula `2612758`; a conta fictícia da DRI utiliza `dri@exemplo.com`. O e-mail do cadastro de aluno permanece como dado de contato.
