import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { ErroAplicacao } from '../features/models';
import type { ResultadoFormulario } from '../features/models';
export function proteger<T>(executar: (args: LoaderFunctionArgs) => Promise<T>) {
  return async (args: LoaderFunctionArgs) => {
    try {
      return await executar(args);
    } catch (erro) {
      if (erro instanceof ErroAplicacao && erro.chave === 'errors.unauthenticated') {
        const url = new URL(args.request.url);
        throw redirect(`/login?retorno=${encodeURIComponent(url.pathname + url.search)}`);
      }
      if (erro instanceof ErroAplicacao && erro.chave === 'errors.forbidden')
        throw redirect('/acesso-negado');
      if (erro instanceof ErroAplicacao && erro.chave === 'errors.notFound')
        throw new Response('', { status: 404 });
      throw erro;
    }
  };
}
export function erroFormulario(
  erro: unknown,
  valores?: Record<string, string>,
): ResultadoFormulario {
  if (erro instanceof ErroAplicacao) {
    if (['errors.unauthenticated', 'errors.forbidden', 'errors.notFound'].includes(erro.chave))
      throw erro;
    return { erro: erro.chave, erros: erro.campos, valores };
  }
  return { erro: 'errors.generic', valores };
}
export function valoresFormulario(formulario: FormData) {
  return Object.fromEntries(
    [...formulario.entries()].map(([chave, valor]) => [chave, String(valor)]),
  );
}
export function destinoSeguro(retorno: string | null, perfil: 'aluno' | 'dri') {
  const padrao = perfil === 'aluno' ? '/aluno' : '/dri';
  if (!retorno || retorno.includes('\\') || retorno.startsWith('//')) return padrao;
  const caminho = retorno.split(/[?#]/)[0];
  return caminho === padrao || caminho.startsWith(`${padrao}/`) ? retorno : padrao;
}
