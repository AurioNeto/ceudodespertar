import { useState } from 'react';
import { Button, Icon, ScreenHeader, StatusBadge, TextField, type BadgeTone } from '../../ds';
import { Interruptor, Select } from '../../components/Campo';
import { useDensidade } from '../../lib/useDensidade';
import { pluralizar } from '../../lib/formato';
import {
  TIPOS_DE_PERGUNTA,
  versoesIniciais,
  type PerguntaDoFormulario,
  type SituacaoDaVersao,
  type VersaoDoFormulario,
} from '../../mocks/anamnese';

const TOM_DA_SITUACAO: Record<SituacaoDaVersao, BadgeTone> = {
  rascunho: 'suggest',
  publicada: 'confirmed',
  arquivada: 'neutral',
};

const rotuloLabel = {
  font: 'var(--text-label)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-field-label)',
} as const;

interface RascunhoDePergunta {
  titulo: string;
  tipo: string;
  alerta: string;
  obrigatoria: boolean;
}

export function AnamnesePage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const [versoes, setVersoes] = useState<readonly VersaoDoFormulario[]>(versoesIniciais);
  const [selecionada, setSelecionada] = useState('v3');
  const [validade, setValidade] = useState('12');
  const [exigir, setExigir] = useState(true);
  const [novaPergunta, setNovaPergunta] = useState<RascunhoDePergunta | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const versao = versoes.find((v) => v.id === selecionada) ?? versoes[0]!;
  const publicada = versoes.find((v) => v.situacao === 'publicada');
  const ehRascunho = versao.situacao === 'rascunho';

  const mexerNasPerguntas = (fn: (lista: PerguntaDoFormulario[]) => PerguntaDoFormulario[]) =>
    setVersoes((lista) =>
      lista.map((v) => (v.id === versao.id ? { ...v, perguntas: fn(v.perguntas.map((p) => ({ ...p }))) } : v)),
    );

  const publicar = () => {
    setVersoes((lista) =>
      lista.map((v) => {
        if (v.id === versao.id) {
          return {
            ...v,
            situacao: 'publicada',
            publicadaEm: '02/09/2026',
            historico: [...v.historico, ['02/09/2026', 'Publicada por Aurio Neto.'] as const],
          };
        }
        if (v.situacao === 'publicada') {
          return {
            ...v,
            situacao: 'arquivada',
            historico: [...v.historico, ['02/09/2026', `Arquivada pela publicação da ${versao.id}.`] as const],
          };
        }
        return v;
      }),
    );
    setMensagem(
      `${versao.rotulo} publicada. A versão anterior foi arquivada, e as respostas dadas nela continuam presas a ela.`,
    );
  };

  const criarRascunho = () => {
    if (versoes.some((v) => v.situacao === 'rascunho')) {
      setMensagem('Já existe um rascunho aberto. Publique ou descarte antes de criar outro.');
      return;
    }
    const numero = versoes.length + 1;
    const nova: VersaoDoFormulario = {
      id: `v${numero}`,
      rotulo: `Anamnese do corpo · v${numero}`,
      situacao: 'rascunho',
      criadaEm: '02/09/2026',
      criadaPor: 'Aurio Neto',
      publicadaEm: null,
      respostas: 0,
      descricao: `Rascunho aberto a partir da ${versao.id}. Enquanto não for publicada, ninguém recebe este formulário.`,
      perguntas: versao.perguntas.map((p) => ({ ...p })),
      historico: [['02/09/2026', `Rascunho criado por Aurio Neto a partir da ${versao.id}.`]],
    };
    setVersoes((lista) => [nova, ...lista]);
    setSelecionada(nova.id);
    setMensagem('Rascunho criado. Editar aqui não muda o formulário que está no ar.');
  };

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-10' : 'F-10 · Anamnese'}
        title="Anamnese"
        subtitle={campo ? undefined : 'O formulário, suas versões e o que cada uma exige'}
        density={densidade}
        actions={
          <Button iconName="circle-plus" onClick={criarRascunho}>
            Novo rascunho
          </Button>
        }
      />

      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 12 : 16,
          maxWidth: campo ? undefined : 1080,
        }}
      >
        {mensagem ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: 'var(--color-royal-soft)',
              border: '1px solid var(--color-royal-border)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
            }}
          >
            <span style={{ font: 'var(--text-body)', color: 'var(--color-royal-deep)' }}>{mensagem}</span>
            <button type="button" aria-label="fechar aviso" onClick={() => setMensagem(null)} style={{ color: 'var(--color-royal-deep)' }}>
              <Icon name="x" size={16} />
            </button>
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: campo ? 'minmax(0,1fr)' : '280px minmax(0,1fr)', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {versoes.map((v) => {
              const on = v.id === versao.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelecionada(v.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5,
                    padding: '11px 13px',
                    border: `1px solid ${on ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
                    background: on ? 'var(--color-royal-soft)' : 'var(--bg-card)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        font: 'var(--text-body-strong)',
                        color: on ? 'var(--color-royal-deep)' : 'var(--text-primary)',
                      }}
                    >
                      {v.rotulo}
                    </span>
                    <StatusBadge tone={TOM_DA_SITUACAO[v.situacao]}>
                      {v.situacao[0]!.toUpperCase()}
                      {v.situacao.slice(1)}
                    </StatusBadge>
                  </span>
                  <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                    {pluralizar(v.perguntas.length, 'pergunta')} · {pluralizar(v.respostas, 'resposta')}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Cartao>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{versao.rotulo}</span>
                <StatusBadge tone={TOM_DA_SITUACAO[versao.situacao]}>
                  {versao.situacao[0]!.toUpperCase()}
                  {versao.situacao.slice(1)}
                </StatusBadge>
                <span style={{ marginLeft: 'auto', font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                  criada em {versao.criadaEm} por {versao.criadaPor}
                  {versao.publicadaEm ? ` · publicada em ${versao.publicadaEm}` : ''}
                </span>
              </div>
              <p style={{ font: 'var(--text-body)', color: 'var(--text-secondary)' }}>{versao.descricao}</p>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {ehRascunho ? (
                  <Button iconName="check-check" onClick={publicar}>
                    Publicar versão
                  </Button>
                ) : null}
                {versao.situacao === 'publicada' ? (
                  <Button
                    variant="ghost"
                    iconName="link"
                    onClick={() =>
                      setMensagem(
                        `Link público copiado: cdd.app/anamnese/${versao.id} — quem responde não precisa de conta.`,
                      )
                    }
                  >
                    Copiar link público
                  </Button>
                ) : null}
              </div>
            </Cartao>

            <Cartao>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Perguntas</span>
                <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                  {ehRascunho
                    ? 'editar só no rascunho — versão publicada não muda'
                    : 'versão fechada: as respostas ficam presas a esta redação'}
                </span>
              </div>

              {versao.perguntas.map((p, i) => (
                <div
                  key={`${p.titulo}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '11px 0',
                    borderBottom: 'var(--border-hairline)',
                  }}
                >
                  <span
                    style={{
                      font: 'var(--text-code)',
                      color: 'var(--text-meta)',
                      fontVariantNumeric: 'tabular-nums',
                      paddingTop: 2,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{p.titulo}</span>
                    <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{p.tipo}</span>
                      {p.obrigatoria ? <StatusBadge tone="royal">Obrigatória</StatusBadge> : null}
                      {p.alerta ? (
                        <span style={{ font: 'var(--text-small)', color: 'var(--color-attention)' }}>
                          ponto de atenção quando: {p.alerta}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  {ehRascunho ? (
                    <span style={{ display: 'flex', gap: 6 }}>
                      <BotaoDaPergunta
                        rotulo="subir"
                        onClick={() =>
                          mexerNasPerguntas((lista) => {
                            if (i === 0) return lista;
                            const tmp = lista[i]!;
                            lista[i] = lista[i - 1]!;
                            lista[i - 1] = tmp;
                            return lista;
                          })
                        }
                      >
                        ↑
                      </BotaoDaPergunta>
                      <BotaoDaPergunta
                        rotulo="descer"
                        onClick={() =>
                          mexerNasPerguntas((lista) => {
                            if (i === lista.length - 1) return lista;
                            const tmp = lista[i]!;
                            lista[i] = lista[i + 1]!;
                            lista[i + 1] = tmp;
                            return lista;
                          })
                        }
                      >
                        ↓
                      </BotaoDaPergunta>
                      <BotaoDaPergunta
                        rotulo="remover"
                        onClick={() => mexerNasPerguntas((lista) => lista.filter((_, j) => j !== i))}
                      >
                        ×
                      </BotaoDaPergunta>
                    </span>
                  ) : null}
                </div>
              ))}

              {ehRascunho ? (
                novaPergunta ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      background: 'var(--bg-sunken)',
                      borderRadius: 'var(--radius)',
                      padding: '13px 14px',
                    }}
                  >
                    <TextField
                      label="Pergunta"
                      value={novaPergunta.titulo}
                      onChange={(e) => setNovaPergunta({ ...novaPergunta, titulo: e.target.value })}
                      placeholder="Faz acompanhamento terapêutico hoje?"
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
                      <Select
                        label="Tipo de resposta"
                        value={novaPergunta.tipo}
                        options={TIPOS_DE_PERGUNTA.map((t) => ({ value: t, label: t }))}
                        onChange={(v) => setNovaPergunta({ ...novaPergunta, tipo: v })}
                      />
                      <TextField
                        label="Vira ponto de atenção quando"
                        value={novaPergunta.alerta}
                        onChange={(e) => setNovaPergunta({ ...novaPergunta, alerta: e.target.value })}
                        placeholder="resposta sim"
                        hint="em branco, a resposta não gera alerta"
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1 }}>
                        Resposta obrigatória
                      </span>
                      <Interruptor
                        ligado={novaPergunta.obrigatoria}
                        onAlternar={() => setNovaPergunta({ ...novaPergunta, obrigatoria: !novaPergunta.obrigatoria })}
                        rotuloAcessivel="Resposta obrigatória"
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <Button
                        iconName="check"
                        disabled={!novaPergunta.titulo.trim()}
                        blockedReason={!novaPergunta.titulo.trim() ? 'Escreva a pergunta.' : undefined}
                        onClick={() => {
                          mexerNasPerguntas((lista) => [
                            ...lista,
                            {
                              titulo: novaPergunta.titulo.trim(),
                              tipo: novaPergunta.tipo,
                              obrigatoria: novaPergunta.obrigatoria,
                              alerta: novaPergunta.alerta.trim() || null,
                            },
                          ]);
                          setNovaPergunta(null);
                        }}
                      >
                        Adicionar
                      </Button>
                      <Button variant="quiet" onClick={() => setNovaPergunta(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="quiet"
                    iconName="plus"
                    onClick={() => setNovaPergunta({ titulo: '', tipo: 'Sim ou não', alerta: '', obrigatoria: true })}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    Adicionar pergunta
                  </Button>
                )
              ) : null}
            </Cartao>

            <Cartao>
              <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
                Regras de validade e exigência
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))', gap: 14 }}>
                <Select
                  label="Anamnese vale por"
                  value={validade}
                  options={[
                    { value: '6', label: '6 meses' },
                    { value: '12', label: '12 meses' },
                    { value: '24', label: '24 meses' },
                  ]}
                  onChange={setValidade}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>
                      Exigir anamnese em dia para confirmar presença
                    </span>
                    <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                      {exigir
                        ? 'quem está vencido ou sem resposta não confirma inscrição'
                        : 'a confirmação passa mesmo com anamnese pendente'}
                    </span>
                  </span>
                  <Interruptor
                    ligado={exigir}
                    onAlternar={() => setExigir((e) => !e)}
                    rotuloAcessivel="Exigir anamnese em dia para confirmar presença"
                  />
                </div>
              </div>
              {publicada ? (
                <span style={{ ...rotuloLabel }}>
                  Em uso hoje: {publicada.rotulo} · {pluralizar(publicada.respostas, 'resposta')}
                </span>
              ) : null}
            </Cartao>

            <Cartao>
              <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Histórico da versão</span>
              {versao.historico.map(([quando, oQue]) => (
                <div key={`${quando}-${oQue}`} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                  <span
                    style={{
                      font: 'var(--text-code)',
                      color: 'var(--text-meta)',
                      fontVariantNumeric: 'tabular-nums',
                      flex: '0 0 auto',
                    }}
                  >
                    {quando}
                  </span>
                  <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{oQue}</span>
                </div>
              ))}
            </Cartao>
          </div>
        </div>
      </div>
    </>
  );
}

function Cartao({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}

function BotaoDaPergunta({
  rotulo,
  onClick,
  children,
}: {
  rotulo: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        border: '1px solid var(--color-line)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  );
}
