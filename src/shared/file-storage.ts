import { ErroAplicacao } from '../features/models';

export interface ArmazenamentoArquivos {
  ler(id: string): Promise<Blob | null>;
  gravar(id: string, arquivo: Blob): Promise<void>;
  remover(id: string): Promise<void>;
  limpar(): Promise<void>;
}

export function criarArmazenamentoArquivosMemoria(): ArmazenamentoArquivos {
  const arquivos = new Map<string, Blob>();
  return {
    async ler(id) {
      return arquivos.get(id) ?? null;
    },
    async gravar(id, arquivo) {
      arquivos.set(id, arquivo);
    },
    async remover(id) {
      arquivos.delete(id);
    },
    async limpar() {
      arquivos.clear();
    },
  };
}

export function criarArmazenamentoArquivosNavegador(): ArmazenamentoArquivos {
  type ArquivoSalvo = { conteudo: ArrayBuffer; tipo: string };
  async function executar<T>(
    modo: IDBTransactionMode,
    operacao: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    try {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const pedido = indexedDB.open('internacionalizacao-arquivos', 1);
        pedido.onupgradeneeded = () => pedido.result.createObjectStore('arquivos');
        pedido.onsuccess = () => resolve(pedido.result);
        pedido.onerror = () => reject(pedido.error);
      });
      try {
        return await new Promise<T>((resolve, reject) => {
          const transacao = db.transaction('arquivos', modo);
          const pedido = operacao(transacao.objectStore('arquivos'));
          transacao.oncomplete = () => resolve(pedido.result);
          transacao.onabort = () => reject(transacao.error);
          transacao.onerror = () => reject(transacao.error);
        });
      } finally {
        db.close();
      }
    } catch {
      throw new ErroAplicacao(modo === 'readonly' ? 'errors.storageRead' : 'errors.storageWrite');
    }
  }
  return {
    async ler(id) {
      const dado = await executar<ArquivoSalvo | Blob | undefined>('readonly', (store) =>
        store.get(id),
      );
      if (!dado) return null;
      if (dado instanceof Blob) return dado;
      if (!(dado.conteudo instanceof ArrayBuffer) || typeof dado.tipo !== 'string')
        throw new ErroAplicacao('errors.storageRead');
      return new Blob([dado.conteudo], { type: dado.tipo });
    },
    async gravar(id, arquivo) {
      try {
        const copia: ArquivoSalvo = { conteudo: await arquivo.arrayBuffer(), tipo: arquivo.type };
        await executar('readwrite', (store) => store.put(copia, id));
      } catch {
        throw new ErroAplicacao('errors.storageWrite');
      }
    },
    async remover(id) {
      await executar('readwrite', (store) => store.delete(id));
    },
    async limpar() {
      await executar('readwrite', (store) => store.clear());
    },
  };
}
