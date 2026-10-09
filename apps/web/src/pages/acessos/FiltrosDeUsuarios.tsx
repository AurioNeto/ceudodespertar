import type { GrupoDaGestao, GrupoId, SituacaoUsuario } from '@cdd/contracts';
import { SITUACOES_DE_USUARIO } from '@cdd/contracts';
import { TextField } from '../../ds';
import { Select } from '../../components/Campo';
import { SITUACAO_DE_USUARIO } from './situacaoDeUsuario';

const TODAS = '';
const TAMANHO_MAXIMO_DA_BUSCA = 200;

export interface FiltrosDeUsuariosProps {
  readonly busca: string;
  readonly situacao: SituacaoUsuario | null;
  readonly grupoId: GrupoId | null;
  readonly grupos: readonly GrupoDaGestao[];
  readonly aoMudarBusca: (busca: string) => void;
  readonly aoMudarSituacao: (situacao: SituacaoUsuario | null) => void;
  readonly aoMudarGrupo: (grupoId: GrupoId | null) => void;
}

const ehSituacao = (valor: string): valor is SituacaoUsuario =>
  SITUACOES_DE_USUARIO.some((situacao) => situacao === valor);

export function FiltrosDeUsuarios({
  busca,
  situacao,
  grupoId,
  grupos,
  aoMudarBusca,
  aoMudarSituacao,
  aoMudarGrupo,
}: FiltrosDeUsuariosProps) {
  return (
    <div role="search" aria-label="Filtros de usuários" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <TextField
        label="Buscar"
        type="search"
        placeholder="nome ou e-mail"
        maxLength={TAMANHO_MAXIMO_DA_BUSCA}
        value={busca}
        onChange={(evento) => aoMudarBusca(evento.target.value)}
        style={{ flex: '1 1 240px' }}
      />
      <Select
        label="Situação"
        value={situacao ?? TODAS}
        options={[
          { value: TODAS, label: 'Todas' },
          ...SITUACOES_DE_USUARIO.map((valor) => ({ value: valor, label: SITUACAO_DE_USUARIO[valor].rotulo })),
        ]}
        onChange={(valor) => aoMudarSituacao(ehSituacao(valor) ? valor : null)}
      />
      <Select
        label="Grupo"
        value={grupoId ?? TODAS}
        options={[
          { value: TODAS, label: 'Todos' },
          ...grupos.map((grupo) => ({ value: grupo.id, label: grupo.nome })),
        ]}
        onChange={(valor) => aoMudarGrupo(grupos.find((grupo) => grupo.id === valor)?.id ?? null)}
      />
    </div>
  );
}
