import { ErroAplicacao } from '../features/models';
import {
  criarArmazenamentoArquivosMemoria,
  criarArmazenamentoArquivosNavegador,
} from './file-storage';
import type { ArmazenamentoArquivos } from './file-storage';
export interface ArmazenamentoJson {
  ler(chave: string): Promise<unknown>;
  gravar(chave: string, valor: unknown): Promise<void>;
  remover(chave: string): Promise<void>;
}
export type Persistencia = {
  dados: ArmazenamentoJson;
  sessao: ArmazenamentoJson;
  arquivos: ArmazenamentoArquivos;
};
export const CHAVES = {
  base: 'internacionalizacao:base:v1',
  idioma: 'internacionalizacao:idioma',
  sessao: 'internacionalizacao:sessao',
};
function criarArmazenamento(obterStorage: () => Storage): ArmazenamentoJson {
  return {
    async ler(chave) {
      try {
        const texto = obterStorage().getItem(chave);
        return texto === null ? null : JSON.parse(texto);
      } catch {
        throw new ErroAplicacao('errors.storageRead');
      }
    },
    async gravar(chave, valor) {
      try {
        const texto = JSON.stringify(valor);
        if (texto === undefined) throw new Error();
        obterStorage().setItem(chave, texto);
      } catch {
        throw new ErroAplicacao('errors.storageWrite');
      }
    },
    async remover(chave) {
      try {
        obterStorage().removeItem(chave);
      } catch {
        throw new ErroAplicacao('errors.storageWrite');
      }
    },
  };
}
export function criarPersistenciaNavegador(): Persistencia {
  return {
    dados: criarArmazenamento(() => window.localStorage),
    sessao: criarArmazenamento(() => window.sessionStorage),
    arquivos: criarArmazenamentoArquivosNavegador(),
  };
}
export function criarArmazenamentoMemoria(): ArmazenamentoJson {
  const valores = new Map<string, string>();
  return {
    async ler(chave) {
      return valores.has(chave) ? JSON.parse(valores.get(chave)!) : null;
    },
    async gravar(chave, valor) {
      const texto = JSON.stringify(valor);
      if (texto === undefined) throw new ErroAplicacao('errors.storageWrite');
      valores.set(chave, texto);
    },
    async remover(chave) {
      valores.delete(chave);
    },
  };
}
export function criarPersistenciaMemoria(): Persistencia {
  return {
    dados: criarArmazenamentoMemoria(),
    sessao: criarArmazenamentoMemoria(),
    arquivos: criarArmazenamentoArquivosMemoria(),
  };
}
