import { useState } from 'react';
import type { Dormitorio, Leito } from '@cdd/contracts';
import { Button, Cartao, Select, StatusBadge, TextField, type Density } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { TIPO_LEITO_ROTULO } from '../../constantes';
import { QuestaoAberta } from './components/QuestaoAberta';

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
  const [novoEm, setNovoEm] = useState<string | null>(null);
  const [identificacao, setIdentificacao] = useState('');
  const [tipo, setTipo] = useState<Leito['tipo']>('BELICHE_INFERIOR');

  const alternarAtivo = (dormitorioId: string, leitoId: string) => {
    onMudar(
      dormitorios.map((d) =>
        (d.id as string) === dormitorioId
          ? { ...d, leitos: d.leitos.map((l) => ((l.id as string) === leitoId ? { ...l, ativo: !l.ativo } : l)) }
          : d,
      ),
    );
    onRecado(null);
  };

  const acrescentar = (d: Dormitorio) => {
    if (!identificacao.trim()) return;
    const novo: Leito = {
      id: `l-novo-${Date.now()}` as Leito['id'],
      identificacao: identificacao.trim(),
      tipo,
      /** A capacidade vem do tipo: só cama de casal comporta duas pessoas. */
      capacidade: tipo === 'CAMA_CASAL' ? 2 : 1,
      ativo: true,
    };
    onMudar(dormitorios.map((x) => (x.id === d.id ? { ...x, leitos: [...x.leitos, novo] } : x)));
    setNovoEm(null);
    setIdentificacao('');
    onRecado(`${novo.identificacao} acrescentado ao ${d.nome.toLowerCase()}. Já aparece no mapa do próximo evento.`);
  };

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

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {d.leitos.map((l, i) => (
              <div
                key={l.id}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px 12px',
                  alignItems: 'center',
                  padding: '9px 0',
                  borderTop: i === 0 ? undefined : '1px solid var(--color-line)',
                  opacity: l.ativo ? 1 : 0.6,
                }}
              >
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
              </div>
            ))}
          </div>

          {novoEm === (d.id as string) ? (
            <div
              style={{
                background: 'var(--bg-sunken)',
                border: '1px solid var(--color-line)',
                borderRadius: 'var(--radius)',
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
                <Button variant="quiet" onClick={() => setNovoEm(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <span>
              <Button
                variant="ghost"
                iconName="plus"
                onClick={() => {
                  setNovoEm(d.id as string);
                  setIdentificacao('');
                  onRecado(null);
                }}
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
