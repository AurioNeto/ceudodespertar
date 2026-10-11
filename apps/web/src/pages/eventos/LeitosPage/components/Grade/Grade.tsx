import type { Dormitorio } from '@cdd/contracts';
import { Cartao, Icon, Rotulo, type Density } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { conflitoDeAgenda, eventoDoMapa, type NoiteId } from '../../mocks/leitos';
import type { Pendencia } from '../../tipos';
import { identificacaoDe } from '../../utils/leitos';
import { EscolhaDeHospede } from './components/EscolhaDeHospede';
import { LinhaDeLeito } from './components/LinhaDeLeito';

export interface GradeProps {
  dormitorios: readonly Dormitorio[];
  densidade: Density;
  ocupantesDe: (leitoId: string, noite: string) => readonly string[];
  escolhendo: { leitoId: string; noite: NoiteId } | null;
  onEscolher: (leitoId: string, noite: NoiteId) => void;
  onFechar: () => void;
  onLiberar: (leitoId: string, noite: string, inscricaoId: string) => void;
  onAlocar: (leitoId: string, noite: NoiteId, inscricaoId: string, nome: string) => void;
  pendencias: readonly Pendencia[];
}

export function Grade({
  dormitorios,
  densidade,
  ocupantesDe,
  escolhendo,
  onEscolher,
  onFechar,
  onLiberar,
  onAlocar,
  pendencias,
}: GradeProps) {
  const campo = densidade === 'field';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: campo ? 13 : 16, minWidth: 0 }}>
      {dormitorios
        .filter((d) => d.ativo)
        .map((d) => (
          <Cartao key={d.id} campo={campo} style={{ gap: 11 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px', alignItems: 'baseline' }}>
              <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{d.nome}</span>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                {pluralizar(d.leitos.filter((l) => l.ativo).length, 'leito ativo', 'leitos ativos')}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 300, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'grid', gridTemplateColumns: `minmax(96px, 1.1fr) repeat(${eventoDoMapa.noites.length}, minmax(104px, 1fr))`, gap: 7 }}>
                  <span />
                  {eventoDoMapa.noites.map((n) => (
                    <span key={n.chave} style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                      <Rotulo>{n.curto}</Rotulo>
                      {n.chave === conflitoDeAgenda.noite ? (
                        <Icon name="triangle-alert" size={12} color="var(--color-pending)" />
                      ) : null}
                    </span>
                  ))}
                </div>

                {d.leitos.map((l) => (
                  <LinhaDeLeito
                    key={l.id}
                    leito={l}
                    densidade={densidade}
                    ocupantesDe={ocupantesDe}
                    escolhendo={escolhendo}
                    onEscolher={onEscolher}
                    onLiberar={onLiberar}
                  />
                ))}
              </div>
            </div>

            {escolhendo && d.leitos.some((l) => (l.id as string) === escolhendo.leitoId) ? (
              <EscolhaDeHospede
                leito={identificacaoDe(dormitorios, escolhendo.leitoId)}
                noite={escolhendo.noite}
                pendencias={pendencias}
                densidade={densidade}
                onFechar={onFechar}
                onAlocar={(inscricaoId, nome) => onAlocar(escolhendo.leitoId, escolhendo.noite, inscricaoId, nome)}
              />
            ) : null}
          </Cartao>
        ))}
    </div>
  );
}
