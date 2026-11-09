import { describe, expect, it } from 'vitest';
import { avaliarElegibilidade, estaVigente, validarConvenio } from './rules';
import type { Matricula } from './models';
const matricula: Matricula = {
  id: 'm',
  alunoId: 'a',
  cursoId: 'c',
  ativa: true,
  percentualConcluido: 50,
  mediaGlobal: 8.2,
  reprovacoes: 0,
};
describe('Regras acadêmicas e vigência', () => {
  it.each([30, 70])('aceita exatamente %s%% de conclusão e média 7', (percentualConcluido) => {
    expect(
      avaliarElegibilidade({ ...matricula, percentualConcluido, mediaGlobal: 7 }).situacao,
    ).toBe('elegivel');
  });
  it.each([
    { percentualConcluido: 29 },
    { percentualConcluido: 71 },
    { mediaGlobal: 6.9 },
    { reprovacoes: 1 },
    { ativa: false },
  ])('rejeita critério não atendido %j', (alteracao) => {
    expect(avaliarElegibilidade({ ...matricula, ...alteracao }).situacao).toBe('inelegivel');
  });
  it('trata dados incompletos como inconclusivos', () => {
    expect(avaliarElegibilidade({ ...matricula, mediaGlobal: null }).situacao).toBe('inconclusiva');
  });
  it('inclui os limites da vigência e exclui datas externas', () => {
    const convenio = {
      id: 'c',
      instituicaoId: 'i',
      cursosIds: ['c'],
      duracaoMeses: 6,
      idiomaEnsino: 'pt',
      inicioVigencia: '2026-01-01',
      fimVigencia: '2026-12-31',
      ativo: true,
      observacoes: '',
    };
    expect(estaVigente(convenio, new Date('2026-01-01T12:00:00'))).toBe(true);
    expect(estaVigente(convenio, new Date('2026-12-31T12:00:00'))).toBe(true);
    expect(estaVigente(convenio, new Date('2027-01-01T12:00:00'))).toBe(false);
    expect(() =>
      validarConvenio({ ...convenio, inicioVigencia: '2026-02-30' }, ['i'], ['c']),
    ).toThrow();
  });
});
