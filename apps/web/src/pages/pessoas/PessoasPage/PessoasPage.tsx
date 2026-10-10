import { useState } from 'react';
import { Button, Icon, ScreenHeader, StatusBadge, type BadgeTone, useDensidade, Avatar, Select } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import {
  acessosIniciais,
  gruposIniciais,
  pessoasIniciais,
  type AcessoAoSistema,
  type EstadoDaAnamnese,
  type GrupoDeAcesso,
  type PessoaDaCasa,
  type SituacaoDeAcesso,
} from './mocks/pessoas';

const TOM_DA_ANAMNESE: Record<EstadoDaAnamnese, BadgeTone> = {
  'em dia': 'confirmed',
  vencida: 'suggest',
  ausente: 'pending',
};

const TEXTO_DA_ANAMNESE: Record<EstadoDaAnamnese, string> = {
  'em dia': 'Anamnese em dia',
  vencida: 'Anamnese vencida',
  ausente: 'Sem anamnese',
};

const ACESSO: Record<SituacaoDeAcesso, { label: string; tone: BadgeTone }> = {
  ativo: { label: 'Acesso ativo', tone: 'confirmed' },
  convite: { label: 'Convite pendente', tone: 'suggest' },
  suspenso: { label: 'Suspenso', tone: 'pending' },
};

const rotuloLabel = {
  font: 'var(--text-label)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-field-label)',
} as const;

export function PessoasPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const [pessoas, setPessoas] = useState<readonly PessoaDaCasa[]>(pessoasIniciais);
  const [acessos, setAcessos] = useState<Record<number, AcessoAoSistema>>({ ...acessosIniciais });
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [fichaId, setFichaId] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const ficha = pessoas.find((p) => p.id === fichaId) ?? null;
  const texto = busca.trim().toLowerCase();

  const listadas = pessoas.filter((p) => {
    if (filtro === 'ativos' && !p.ativa) return false;
    if (filtro === 'pendentes' && p.anamnese === 'em dia') return false;
    if (filtro !== 'todos' && filtro !== 'ativos' && filtro !== 'pendentes' && p.vinculo !== filtro) return false;
    if (texto && ![p.nome, p.cidade, p.telefone].join(' ').toLowerCase().includes(texto)) return false;
    return true;
  });

  const emDia = pessoas.filter((p) => p.anamnese === 'em dia').length;
  const pendentes = pessoas.filter((p) => p.anamnese !== 'em dia').length;
  const comAcesso = Object.keys(acessos).length;
  const comAcessoInativas = Object.keys(acessos).filter(
    (id) => !pessoas.find((p) => p.id === Number(id))?.ativa,
  ).length;

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-09' : 'F-09 · Pessoas'}
        title="Pessoas"
        subtitle={campo ? undefined : 'Quem é da casa e quem entra no sistema — dois eixos, um cadastro só'}
        density={densidade}
        actions={
          <Button iconName="user-plus" onClick={() => setMensagem('Formulário de nova pessoa — cadastro e convite.')}>
            Nova pessoa
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

        {!ficha ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: campo ? 'repeat(2,minmax(0,1fr))' : 'repeat(auto-fit,minmax(170px,1fr))',
                gap: 12,
              }}
            >
              <Kpi rotulo="Cadastradas" valor={`${pessoas.length}`} nota={`${pessoas.filter((p) => p.ativa).length} ativas`} />
              <Kpi rotulo="Anamnese em dia" valor={`${emDia}`} cor="var(--color-confirmed)" nota="dentro da validade" />
              <Kpi rotulo="Anamnese pendente" valor={`${pendentes}`} cor="var(--color-pending)" nota="sem resposta ou vencida" />
              <Kpi
                rotulo="Com acesso"
                valor={`${comAcesso}`}
                nota={
                  comAcessoInativas
                    ? `${pluralizar(comAcessoInativas, 'tem cadastro inativo', 'têm cadastro inativo')}`
                    : 'todas com cadastro ativo'
                }
              />
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', flexDirection: 'column', flex: '1 1 240px' }}>
                <span style={{ ...rotuloLabel, marginBottom: 7 }}>Buscar</span>
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="nome, cidade ou telefone"
                  style={{
                    minHeight: 'var(--target-office)',
                    border: '1px solid var(--color-line-strong)',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius)',
                    padding: '10px 13px',
                    font: 'var(--text-body)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </label>
              <Select
                label="Filtro"
                value={filtro}
                options={[
                  { value: 'todos', label: 'Todas' },
                  { value: 'Fardado', label: 'Fardados' },
                  { value: 'Frequentador', label: 'Frequentadores' },
                  { value: 'Visitante', label: 'Visitantes' },
                  { value: 'pendentes', label: 'Anamnese pendente' },
                  { value: 'ativos', label: 'Somente ativas' },
                ]}
                onChange={setFiltro}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {listadas.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFichaId(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    padding: '11px 14px',
                    border: 'var(--border-hairline)',
                    borderRadius: 'var(--radius)',
                    background: p.ativa ? 'var(--bg-card)' : 'var(--bg-sunken)',
                    opacity: p.ativa ? 1 : 0.75,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Avatar nome={p.nome} />
                  <span style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{p.nome}</span>
                    <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                      {p.vinculo} desde {p.desde} · {p.cidade}
                    </span>
                  </span>
                  {p.pontos.length ? (
                    <span title={p.pontos.map(([t]) => t).join(' · ')} style={{ display: 'flex', cursor: 'help' }}>
                      <Icon name="triangle-alert" size={16} color="var(--color-attention)" />
                    </span>
                  ) : null}
                  <StatusBadge tone={TOM_DA_ANAMNESE[p.anamnese]}>{TEXTO_DA_ANAMNESE[p.anamnese]}</StatusBadge>
                  {acessos[p.id] ? <StatusBadge tone="royal">{acessos[p.id]!.grupo}</StatusBadge> : null}
                  {!p.ativa ? <StatusBadge tone="neutral">Inativa</StatusBadge> : null}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {ficha ? (
          <FichaDaPessoa
            pessoa={ficha}
            acesso={acessos[ficha.id] ?? null}
            grupos={gruposIniciais}
            onVoltar={() => setFichaId(null)}
            onAviso={setMensagem}
            onInativar={() => {
              setPessoas((lista) => lista.map((p) => (p.id === ficha.id ? { ...p, ativa: !p.ativa } : p)));
              setMensagem(
                ficha.ativa
                  ? 'Cadastro inativado. Nada é apagado — presenças e anamneses continuam no histórico.'
                  : 'Cadastro reativado.',
              );
            }}
            onMudarGrupo={(grupo) => {
              setAcessos((a) => ({ ...a, [ficha.id]: { ...a[ficha.id]!, grupo } }));
              setMensagem('Grupo de permissão atualizado.');
            }}
            onConceder={() => {
              setAcessos((a) => ({
                ...a,
                [ficha.id]: {
                  email: `${ficha.nome.toLowerCase().split(' ')[0]}@cdd.org`,
                  grupo: 'Leitura',
                  situacao: 'convite',
                  ultimoAcesso: 'nunca entrou',
                },
              }));
              setMensagem('Convite enviado. O acesso nasce no grupo Leitura.');
            }}
            onRevogar={() => {
              setAcessos((a) => {
                const copia = { ...a };
                delete copia[ficha.id];
                return copia;
              });
              setMensagem('Acesso revogado. O histórico do que essa pessoa lançou continua intacto.');
            }}
          />
        ) : null}
      </div>
    </>
  );
}

function Kpi({ rotulo, valor, nota, cor = 'var(--color-royal-deep)' }: { rotulo: string; valor: string; nota: string; cor?: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <span style={rotuloLabel}>{rotulo}</span>
      <span
        style={{
          font: 'var(--text-amount-lg)',
          letterSpacing: 'var(--tracking-amount)',
          fontVariantNumeric: 'tabular-nums',
          color: cor,
        }}
      >
        {valor}
      </span>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span>
    </div>
  );
}

function FichaDaPessoa({
  pessoa,
  acesso,
  grupos,
  onVoltar,
  onAviso,
  onInativar,
  onMudarGrupo,
  onConceder,
  onRevogar,
}: {
  pessoa: PessoaDaCasa;
  acesso: AcessoAoSistema | null;
  grupos: readonly GrupoDeAcesso[];
  onVoltar: () => void;
  onAviso: (t: string) => void;
  onInativar: () => void;
  onMudarGrupo: (grupo: string) => void;
  onConceder: () => void;
  onRevogar: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button
        type="button"
        onClick={onVoltar}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          font: 'var(--text-small)',
          color: 'var(--color-royal)',
          cursor: 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        <Icon name="arrow-left" size={16} color="var(--color-royal)" />
        Voltar para a lista
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <Avatar nome={pessoa.nome} />
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <h2 style={{ font: 'var(--text-title)', letterSpacing: 'var(--tracking-display)', color: 'var(--text-title)' }}>
            {pessoa.nome}
          </h2>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            {pessoa.vinculo} desde {pessoa.desde} · {pessoa.cidade}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Button variant="ghost" iconName="pencil" onClick={() => onAviso('Edição do cadastro da pessoa.')}>
            Editar
          </Button>
          <Button variant="quiet" iconName="send" onClick={() => onAviso(`Anamnese enviada para ${pessoa.nome}.`)}>
            Enviar anamnese
          </Button>
          <Button variant="quiet" iconName="user-x" onClick={onInativar}>
            {pessoa.ativa ? 'Inativar' : 'Reativar'}
          </Button>
        </div>
      </div>

      <Cartao titulo="Dados">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
          <Dado rotulo="Telefone" valor={pessoa.telefone} />
          <Dado rotulo="Nascimento" valor={pessoa.nascimento} />
          <Dado rotulo="Cidade" valor={pessoa.cidade} />
          <Dado rotulo="Contato de emergência" valor={pessoa.emergencia} />
        </div>
      </Cartao>

      <Cartao
        titulo="Anamnese"
        nota={
          pessoa.respondidaEm
            ? `respondida em ${pessoa.respondidaEm} · formulário ${pessoa.versao}`
            : 'nunca respondeu'
        }
      >
        <StatusBadge tone={TOM_DA_ANAMNESE[pessoa.anamnese]} style={{ alignSelf: 'flex-start' }}>
          {TEXTO_DA_ANAMNESE[pessoa.anamnese]}
        </StatusBadge>
        {pessoa.pontos.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pessoa.pontos.map(([titulo, detalhe]) => (
              <div
                key={titulo}
                style={{
                  background: 'var(--color-attention-soft)',
                  border: '1px solid var(--color-attention-border)',
                  borderRadius: 'var(--radius)',
                  padding: '11px 13px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                }}
              >
                <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{titulo}</span>
                <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{detalhe}</span>
              </div>
            ))}
          </div>
        ) : (
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Nenhum ponto de atenção declarado.
          </span>
        )}
      </Cartao>

      <Cartao titulo="Acesso ao sistema">
        {acesso ? (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: '1 1 200px' }}>
                {acesso.email}
              </span>
              <select
                value={acesso.grupo}
                onChange={(e) => onMudarGrupo(e.target.value)}
                aria-label="Grupo de permissão"
                style={{
                  minHeight: 38,
                  border: '1px solid var(--color-line-strong)',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 10px',
                  font: 'var(--text-small)',
                  color: 'var(--text-primary)',
                }}
              >
                {grupos.map((g) => (
                  <option key={g.id} value={g.nome}>
                    {g.nome}
                  </option>
                ))}
              </select>
              <StatusBadge tone={ACESSO[acesso.situacao].tone}>{ACESSO[acesso.situacao].label}</StatusBadge>
              <Button variant="quiet" onClick={onRevogar}>
                Revogar acesso
              </Button>
            </div>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
              Último acesso: {acesso.ultimoAcesso}. Revogar não apaga o histórico de lançamentos.
            </span>
          </>
        ) : (
          <>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              Esta pessoa não entra no sistema. Conceder acesso cria um usuário ligado a este cadastro.
            </span>
            <Button variant="ghost" iconName="key-round" onClick={onConceder} style={{ alignSelf: 'flex-start' }}>
              Conceder acesso
            </Button>
          </>
        )}
      </Cartao>
    </div>
  );
}

function Cartao({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{titulo}</span>
        {nota ? <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={rotuloLabel}>{rotulo}</span>
      <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{valor}</span>
    </div>
  );
}
