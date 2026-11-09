# Validação — Internacionalização

Execução em 8 de novembro de 2026. Esta matriz distingue verificação técnica do protótipo e validação com usuários reais.

## Resultado técnico

- TypeScript estrito: aprovado.
- ESLint: aprovado.
- Build de produção: aprovado.
- Vitest/Testing Library: **89 testes aprovados** em 5 arquivos.
- Playwright: **45 cenários validados** nos motores Chrome, Firefox e WebKit, incluindo configuração do edital, bloqueio por prazo, criação da candidatura, revisão documental, separação dos estados do aluno e avisos do DRI em desktop e celular. Quatro casos WebKit afetados por alterações simultâneas nos formulários passaram na repetição dirigida.
- Dependências: `npm audit` sem vulnerabilidades conhecidas na execução final.
- Armazenamento: `localStorage` e `sessionStorage` restritos a `src/shared/persistence.ts`; arquivos em IndexedDB isolados em `src/shared/file-storage.ts`.
- PDF: download validado no navegador, cabeçalho `%PDF-1.3`, texto extraído e primeira página renderizada para inspeção visual. Acentuação e correspondência do filtro conferidas.

Os testes de contrato exercitam a mesma aplicação sobre persistência em memória e navegador. Cobrem login de aluno por matrícula, login da DRI por e-mail, atualização do cadastro demonstrativo anterior sem perda de registros, sessão, preservação de dados, permissões, cadastro duplicado, vínculos ativos/inativos/múltiplos, filtros, vigência, edição de instituição compartilhada, inativação com preservação de histórico, avisos, atendimento, restauração e dados armazenados inválidos.

## Navegadores

| Navegador/motor                  | Versão executada          | Resultado                     |
| -------------------------------- | ------------------------- | ----------------------------- |
| Google Chrome instalado no macOS | 156.0.8078.80             | 15 fluxos aprovados           |
| Firefox pelo Playwright          | 159.0                     | 15 fluxos aprovados           |
| WebKit pelo Playwright           | 27.2                      | 15 fluxos aprovados, quatro na repetição |
| Microsoft Edge                   | Não instalado no ambiente | Validação específica pendente |

WebKit é uma verificação adicional de motor; não equivale a uma avaliação em aparelho iOS físico. Viewports de 360, 390, 768 e 1280 px foram conferidos sem transbordamento horizontal. O menu mobile foi operado nos testes. A apresentação de desktop e celular também foi inspecionada visualmente.

## Matriz funcional

| Requisito | Evidência                                                                                                                                                                | Limite                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| RF001     | Troca PT → EN → ES, textos atualizados e preferência após reload.                                                                                                        | Conteúdo livre cadastrado é mantido no idioma informado.           |
| RF002     | Cadastro real no mock, recuperação após reload e rejeição de matrícula duplicada.                                                                                        | Sem integração acadêmica ou criação de acesso.                     |
| RF011     | DRI cria instituição e convênio, edita duração e inativa; aluno vê o efeito ao consultar novamente.                                                                      | Dados fictícios e permissões demonstrativas no cliente.            |
| RF003     | Lisboa, Madri e Montreal para Carol; Porto não liberado por matrícula inativa; casos sem vínculo e com múltiplos vínculos testados.                                      | Sem consulta ao sistema de matrículas da universidade.             |
| RF004     | País/duração no navegador, filtros combinados e área no contrato, URL preservada no reload.                                                                              | Consulta ao catálogo local.                                        |
| RF005     | Limites inclusivos de 30%, 70% e média 7; reprovação, vínculo inativo e dados incompletos testados.                                                                      | Dados acadêmicos demonstrativos.                                   |
| RF006     | Candidatura, documentos e resumo compartilham a mesma fonte; histórico preservado após inativação.                                                                       | **Tempo real pendente**, por decisão de escopo.                    |
| RF007     | PDF baixado nos três motores, com filtro de finalizados aplicado.                                                                                                        | Emitido sobre intercâmbios demonstrativos.                         |
| RF008     | Todas as categorias verificadas no navegador, com destino da candidatura.                                                                                                | Orientações de exemplo.                                            |
| RF009     | Aluno e DRI têm card, lista e sino; leitura persiste após reload e novo login. Perfis e destinatários são isolados, e bases antigas são compatibilizadas.                | Sem disparos externos; eventos preparados.                         |
| RF010     | Aluno abre por WhatsApp simulado; DRI responde; aluno consulta a mesma conversa e canal.                                                                                 | Sem integração com portal externo, provedor de e-mail ou WhatsApp. |
| RF012     | 11 campos; seleção sem persistir; confirmação por botão, reload, download com bytes equivalentes, substituição, remoção e rejeição de formato inválido nos três motores. | Envio simulado local; revisão demonstrativa descrita no RF013.     |

## Avisos no acesso do DRI — RF009

Os dois fluxos de avisos passaram em Chrome, Firefox e WebKit. Foram conferidos o resumo de até dois não lidos ao lado de Convênios, a lista completa em `/dri/avisos`, o sino com contador, a leitura após recarregar e entrar novamente, o estado de todos lidos e a separação dos avisos de aluno e DRI. A posição dos cards e a ausência de transbordamento foram verificadas em 360, 390, 768 e 1280 px. Os três lembretes e os controles foram exercitados em português, inglês e espanhol; desktop e celular também tiveram inspeção visual.

Os contratos em memória e navegador verificam autenticação, destinatários DRI distintos, rejeição de tipos incompatíveis com o perfil e atualização de avisos legados sem duplicação ou perda de cadastros, anexos e leituras. Os lembretes são demonstrativos; mudanças nos convênios e documentos não geram avisos automaticamente.

## Revisão documental — RF013

Nos três motores, o aluno enviou histórico e passaporte; a DRI acessou a candidatura pelo painel, abriu a prévia da imagem, baixou os mesmos bytes, aprovou um documento e pediu correção de outro. O pedido sem orientação foi rejeitado. A decisão persistiu após reload e apareceu para o aluno, que reenviou a correção; o documento voltou a aguardar análise e foi aprovado em nova revisão. A tela da DRI foi conferida em viewport de celular sem transbordamento.

Os contratos também validam permissões, revisão sem arquivo, decisão inválida, limite de orientação, rejeição de versão substituída e perda da aprovação após reenvio ou remoção. A revisão é demonstrativa, persistida neste navegador; a seleção de intercâmbio permanece um cenário de exemplo.

## RNF003 — carregamento de oportunidades

Medição no build de produção servido localmente pelo Vite Preview, Chrome 156.0.8078.80, viewport 1280 × 1000. Sessão autenticada, cache de rede desativado e sem limitação artificial de rede/CPU. O cronômetro começa antes da navegação e termina quando o terceiro cartão está visível.

Cinco medições: **48, 42, 100, 37 e 36 ms**. Máximo: **100 ms**, abaixo de 2 segundos neste cenário local. Não existe API remota nem atraso artificial nessa medição. A meta deve ser reavaliada em hospedagem e backend reais.

Para reproduzir, em um terminal:

```sh
npm run build
npm run preview -- --port 4173
```

Em outro:

```sh
npm run measure:performance
```

## RNF004 — validação necessária com a DRI

A meta de 90% de sucesso na primeira tentativa **não foi declarada atendida por testes automatizados**. Ela depende de participantes da equipe da DRI.

1. Entregar as credenciais de DRI e dados fictícios de um aluno.
2. Pedir o cadastro sem orientar os passos durante a tarefa.
3. Registrar participantes, conclusões corretas e erros de navegação.
4. Calcular `conclusões sem erro / participantes × 100`.
5. Considerar a meta atendida somente com resultado de pelo menos 90%.

## Demais verificações pendentes

- Uso em aparelhos Android e iOS físicos.
- Execução específica no Microsoft Edge.
- Validação com professor, estudantes e representantes da DRI.
- Segurança, autenticação e permissões do futuro backend.

## Roteiro de demonstração

1. Entrar como DRI e abrir Convênios.
2. Criar instituição e convênio para Engenharia de Computação.
3. Sair, entrar como aluno e localizar a oportunidade.
4. Voltar à DRI e alterar duração ou cursos atendidos.
5. Consultar novamente como aluno e conferir os filtros.
6. Inativar o convênio como DRI e confirmar sua retirada do catálogo do aluno.
7. Conferir a candidatura histórica.
8. Abrir um atendimento como aluno, responder como DRI e consultar a resposta.
9. Baixar um relatório de intercâmbios finalizados.
10. Restaurar a demonstração pelo menu da conta para repetir os exemplos.

## Navegação e rolagem

Seis execuções adicionais nos três motores validaram, em viewport de celular, que novas páginas abrem no topo, voltar/avançar restaura a posição anterior e aplicar filtros na mesma página mantém a leitura. O controle é centralizado no layout raiz e usa somente memória.

A posição também é capturada antes de cliques e navegações do histórico, para preservar a leitura mesmo quando o navegador ainda não entregou o último evento de rolagem.

## Guia de candidatura e menus

Os campos **Primeira opção** e **Segunda opção** foram conferidos em desktop e celular, sem campo de semestre no formulário do aluno. Os testes verificam a persistência da ordem das opções, sua apresentação ao aluno e à DRI, a segunda opção opcional e a rejeição de opções repetidas, inexistentes, inativas ou incompatíveis.

O formulário de nova candidatura e a configuração de edital foram validados nos três motores em desktop e celular. A DRI alterou número, título, semestre, link, orientações e datas; a janela encerrada bloqueou a criação e a reabertura permitiu a inscrição de Luiza. O aluno enviou um documento, a DRI aprovou e a decisão apareceu na candidatura criada. Configurações, candidatura e anexo persistiram após reload. A despublicação também foi exercitada.

Os testes de domínio cobrem os limites de abertura e encerramento no horário de Fortaleza, dados inválidos, permissões, confirmação de leitura, destino incompatível, elegibilidade, convênio vencido, mudança de edital durante o preenchimento, cliques concorrentes, falha de gravação e migração da base anterior. O edital de origem é preservado mesmo quando a DRI altera a configuração para outro semestre.

Para alunos sem candidatura, o início apresenta **Como se candidatar**, com os prazos do edital configurado pela DRI, antecedência de seis meses, os 11 documentos visíveis no flyer, taxa não reembolsável com reajuste anual, orientação sobre idioma e aproveitamento dos estudos no retorno. Para alunos com candidatura, o início apresenta o acompanhamento. O conteúdo foi conferido em desktop e celular, e a troca PT → EN → ES foi validada no navegador. A consulta às universidades e seus filtros permanece em **Universidades**.

Nos perfis de aluno e DRI, os testes verificam que cliques dentro do menu da conta o mantêm aberto, enquanto cliques fora, foco fora, Escape e navegação o fecham. O menu de navegação mobile também fecha ao clicar fora, navegar ou pressionar Escape. Escape devolve o foco ao controle que abre o menu.

## Documentos e leitura no celular

Os testes de contrato cobrem normalização do cenário anterior, envios concorrentes sem perda de anexos, persistência de metadados, substituição, remoção, arquivo vazio, extensão/MIME inválidos, tamanho superior a 5 MB, ausência de sessão e acesso por outra candidatura ou perfil. Nos contratos, os arquivos usam o adaptador em memória; o armazenamento real em IndexedDB e a recuperação dos bytes após reload são exercitados pelo Playwright nos três motores.

Em avisos de 360 e 390 px, o texto mantém uma coluna de leitura e a ação fica abaixo dele. O teste verifica a largura disponível e a posição da ação. Os campos de documentos e avisos também foram inspecionados visualmente em desktop e celular.
