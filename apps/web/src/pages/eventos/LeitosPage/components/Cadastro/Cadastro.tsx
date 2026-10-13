import type { Dormitorio, Leito } from '@cdd/contracts';
import { Button, Cartao, ListaDividida, Select, StatusBadge, TextField, type Density } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { TIPO_LEITO_ROTULO } from '../../constantes';
import { QuestaoAberta } from './components/QuestaoAberta';
import { useCadastro } from './hooks/useCadastro';

export interface CadastroProps {
  dormitorios: readonly Dormitorio[];
  onMudar: (d: readonly Dormitorio[]) => void;
  densidade: Density;
  onRecado: (r: string | null) => void;
  /** Quantas noites do evento aberto este leito já tem alocadas. */
  noitesOcupadas: (leitoId: string) => number;
}

export function Cadastro({
  dormitorios,
  onMudar,
  densidade,
  onRecado,
  noitesOcupadas,
}: CadastroProps) {
  const campo = densidade === 'field';
  const { novoEm, identificacao, setIdentificacao, tipo, setTipo, alternarAtivo, acrescentar, abrirNovoEm, cancelarNovo } =
    useCadastro({ dormitorios, onMudar, onRecado });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: campo ? 13 : 16 }}>
      <QuestaoAberta />

      {dormitorios.map((d) => (
        <Cartao key={d.id} campo={campo} style={{ gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px', alignItems: 'baseline' }}>
            <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{d.nome}</span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
              {pluralizar(d.leitos.filter((l) => l.ativo).length, 'leito ativo', 'leitos ativos')}
              {d.leitos.some((l) => !l.ativo)
                ? ` · ${pluralizar(d.leitos.filter((l) => !l.ativo).length, 'inativo', 'inativos')}`
                : ''}
            </span>
          </div>

          <ListaDividida itens={d.leitos} chave={(l) => l.id} alinhamento="centro" esmaecido={(l) => !l.ativo}>
            {(l) => (
              <>
                <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 130 }}>
                  {l.identificacao}
                </span>
                <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', flex: 1, minWidth: 130 }}>
                  {TIPO_LEITO_ROTULO[l.tipo]}
                </span>
                {l.ativo ? null : <StatusBadge tone="neutral">Inativo</StatusBadge>}
                {(() => {
                  const ocupadas = noitesOcupadas(l.id as string);
                  const travado = l.ativo && ocupadas > 0;
                  return (
                    <Button
                      variant="ghost"
                      disabled={travado}
                      blockedReason={
                        travado
                          ? `Tem gente alocada em ${pluralizar(ocupadas, 'noite')} do evento aberto. Libere no mapa primeiro — inativar um leito ocupado faria a alocação sumir da grade sem sumir da conta.`
                          : undefined
                      }
                      onClick={() => alternarAtivo(d.id as string, l.id as string)}
                    >
                      {l.ativo ? 'Inativar' : 'Reativar'}
                    </Button>
                  );
                })()}
              </>
            )}
          </ListaDividida>

          {novoEm === (d.id as string) ? (
            <div
              style={{
                background: 'var(--bg-sunken)',
                border: '1px solid var(--color-line)',
                borderRadius: 'var(--leaf-lg)',
                padding: '13px 15px',
                display: 'flex',
                flexDirection: 'column',
                gap: 11,
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: campo ? '1fr' : '1fr 1fr', gap: 11 }}>
                <TextField
                  label="Identificação"
                  placeholder="F5 · superior"
                  value={identificacao}
                  density={campo ? 'field' : 'office'}
                  onChange={(e) => setIdentificacao(e.target.value)}
                />
                <Select
                  label="Tipo"
                  value={tipo}
                  onChange={(v) => setTipo(v as Leito['tipo'])}
                  options={(Object.keys(TIPO_LEITO_ROTULO) as Leito['tipo'][]).map((t) => ({
                    value: t,
                    label: TIPO_LEITO_ROTULO[t],
                  }))}
                />
              </div>
              <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                <Button iconName="check" onClick={() => acrescentar(d)}>
                  Acrescentar
                </Button>
                <Button variant="quiet" onClick={cancelarNovo}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <span>
              <Button
                variant="ghost"
                iconName="plus"
                onClick={() => abrirNovoEm(d.id as string)}
              >
                Acrescentar leito
              </Button>
            </span>
          )}
        </Cartao>
      ))}

      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        Leito não se exclui, <b>se inativa</b>. Um beliche que já recebeu gente em algum evento faz parte do histórico
        daquele evento, e apagá-lo faria o mapa de uma cerimônia passada apontar para o nada.
      </span>
    </div>
  );
}
