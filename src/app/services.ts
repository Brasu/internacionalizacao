import { criarPersistenciaNavegador } from '../shared/persistence';
import { criarServicosLocais } from '../features/services';
export const APP_NAME = 'Internacionalização';
export const servicos = criarServicosLocais(criarPersistenciaNavegador());
