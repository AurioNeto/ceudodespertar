import { useState } from 'react';
import { Button, Icon, ScreenHeader, StatusBadge, TextField, type IconName } from '../../ds';
import { Interruptor, SeletorDeTipo } from '../../components/Campo';
import { useDensidade } from '../../lib/useDensidade';
import { iniciais } from '../../lib/formato';

type Aba = 'dados' | 'acesso' | 'avisos' | 'anamnese';

const ORIGINAL = {
  nome: 'Aurio Neto',
  apelido: 'Aurio',
  telefone: '(11) 98123-4567',
  email: 'aurio.neto@cdd.org',
  cidade: 'Ibiúna · SP',
  nascimento: '09/03/1979',
  emergencia: 'Marta Neto · (11) 99888-1212',
} as const;

type Dados = { -readonly [K in keyof typeof ORIGINAL]: string };

const VINCULO = 'Fardado desde 2010';
const GRUPO = 'Tesouraria';

const AVISOS: readonly { chave: string; titulo: string; quando: string }[] = [
  { chave: 'cerimonia', titulo: 'Cerimônia chegando', quando: 'três dias antes de cada trabalho' },
  { chave: 'preparo', titulo: 'Tarefa de preparo', quando: 'quando algo entra no seu nome' },
  { chave: 'anamnese', titulo: 'Anamnese vencendo', quando: 'trinta dias antes de perder a validade' },
  { chave: 'fila', titulo: 'Fila de conferência', quando: 'quando há lançamento esperando você' },
  { chave: 'resumo', titulo: 'Resumo do mês', quando: 'no fechamento da competência' },
];

const rotuloLabel = {
  font: 'var(--text-label)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-field-label)',
} as const;

export function MeuPerfilPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const [aba, setAba] = useState<Aba>('dados');
  const [dados, setDados] = useState<Dados>({ ...ORIGINAL });
  const [temFoto, setTemFoto] = useState(false);
  const [duasEtapas, setDuasEtapas] = useState(true);
  const [compartilhar, setCompartilhar] = useState(true);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<Record<string, { whats: boolean; email: boolean }>>({
    cerimonia: { whats: true, email: false },
    preparo: { whats: true, email: false },
    anamnese: { whats: true, email: true },
    fila: { whats: false, email: true },
    resumo: { whats: false, email: true },
  });
  const [sessoes, setSessoes] = useState([
    { id: 1, aparelho: 'iPhone de Aurio', icone: 'smartphone' as IconName, meta: 'Ibiúna · agora mesmo', atual: true },
    { id: 2, aparelho: 'Notebook da secretaria', icone: 'monitor' as IconName, meta: 'Ibiúna · ontem, 19:40', atual: false },
    { id: 3, aparelho: 'Chrome · Windows', icone: 'globe' as IconName, meta: 'São Paulo · 24/08, 08:12', atual: false },
  ]);

  const alterado = (Object.keys(ORIGINAL) as (keyof Dados)[]).some((k) => ORIGINAL[k] !== dados[k]);
  const alterar = (campoDado: keyof Dados, valor: string) => setDados((d) => ({ ...d, [campoDado]: valor }));

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-11' : 'F-11 · Meu perfil'}
        title="Meu perfil"
        subtitle={campo ? undefined : 'Seus dados, seu acesso e a sua anamnese'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 12 : 16,
          maxWidth: campo ? undefined : 860,
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

        <SeletorDeTipo
          opcoes={[
            { valor: 'dados', label: 'Meus dados' },
            { valor: 'acesso', label: 'Acesso e segurança' },
            { valor: 'avisos', label: 'Avisos' },
            { valor: 'anamnese', label: 'Minha anamnese' },
          ]}
          valor={aba}
          onEscolher={setAba}
          densidade={densidade}
        />

        {aba === 'dados' ? (
          <>
            <Cartao>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <span
                  style={{
                    width: 74,
                    height: 74,
                    borderRadius: 'var(--radius)',
                    background: temFoto ? 'var(--color-royal)' : 'var(--color-royal-soft)',
                    color: temFoto ? '#fff' : 'var(--color-royal-deep)',
                    display: 'grid',
                    placeItems: 'center',
                    font: '700 24px var(--font-data)',
                  }}
                >
                  {temFoto ? <Icon name="user-round" size={34} color="#fff" /> : iniciais(dados.nome)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{dados.nome}</div>
                  <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                    {VINCULO} · grupo {GRUPO}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Button
                    variant="ghost"
                    iconName="camera"
                    onClick={() => {
                      setTemFoto(true);
                      setMensagem(temFoto ? 'Foto atualizada.' : 'Foto enviada. Ela aparece para quem organiza os trabalhos.');
                    }}
                  >
                    {temFoto ? 'Trocar foto' : 'Enviar foto'}
                  </Button>
                  {temFoto ? (
                    <Button
                      variant="quiet"
                      onClick={() => {
                        setTemFoto(false);
                        setMensagem('Foto removida — voltamos para as iniciais.');
                      }}
                    >
                      Remover
                    </Button>
                  ) : null}
                </div>
              </div>
            </Cartao>

            <Cartao>
              <div style={{ display: 'grid', gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))', gap: 14 }}>
                <TextField label="Nome" value={dados.nome} onChange={(e) => alterar('nome', e.target.value)} />
                <TextField label="Apelido" value={dados.apelido} onChange={(e) => alterar('apelido', e.target.value)} />
                <TextField label="Telefone" value={dados.telefone} onChange={(e) => alterar('telefone', e.target.value)} />
                <TextField label="E-mail" value={dados.email} onChange={(e) => alterar('email', e.target.value)} />
                <TextField label="Cidade" value={dados.cidade} onChange={(e) => alterar('cidade', e.target.value)} />
                <TextField
                  label="Nascimento"
                  value={dados.nascimento}
                  onChange={(e) => alterar('nascimento', e.target.value)}
                />
                <TextField
                  label="Contato de emergência"
                  value={dados.emergencia}
                  onChange={(e) => alterar('emergencia', e.target.value)}
                  style={{ gridColumn: campo ? undefined : '1 / -1' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={rotuloLabel}>Vínculo com a casa</span>
                <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{VINCULO}</span>
                <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                  Só a secretaria muda o vínculo — aqui ele é leitura.
                </span>
              </div>

              {alterado ? (
                <span style={{ font: 'var(--text-small)', color: 'var(--color-pending)' }}>
                  Há alterações não salvas.
                </span>
              ) : null}

              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Button
                  iconName="check"
                  disabled={!alterado}
                  blockedReason={!alterado ? 'Nada foi alterado ainda.' : undefined}
                  onClick={() => setMensagem('Dados salvos. A secretaria vê a alteração no seu cadastro.')}
                >
                  Salvar
                </Button>
                <Button
                  variant="quiet"
                  disabled={!alterado}
                  onClick={() => {
                    setDados({ ...ORIGINAL });
                    setMensagem('Alterações desfeitas.');
                  }}
                >
                  Desfazer
                </Button>
              </div>
            </Cartao>
          </>
        ) : null}

        {aba === 'acesso' ? (
          <>
            <Cartao>
              <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Entrada no sistema</span>
              <div style={{ display: 'grid', gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))', gap: 14 }}>
                <Leitura rotulo="Login" valor={dados.email} />
                <Leitura rotulo="Grupo de permissão" valor={GRUPO} nota="quem muda é um administrador" />
              </div>
              <Button
                variant="ghost"
                iconName="key-round"
                onClick={() => setMensagem('Enviamos um link de troca de senha para o seu e-mail.')}
                style={{ alignSelf: 'flex-start' }}
              >
                Trocar senha
              </Button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: 'var(--border-hairline)', paddingTop: 12 }}>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>Código por WhatsApp na entrada</span>
                  <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                    uma segunda etapa além da senha
                  </span>
                </span>
                <Interruptor
                  ligado={duasEtapas}
                  onAlternar={() => {
                    setDuasEtapas((d) => !d);
                    setMensagem(duasEtapas ? 'Código por WhatsApp desligado.' : 'Código por WhatsApp ligado.');
                  }}
                  rotuloAcessivel="Código por WhatsApp na entrada"
                />
              </div>
            </Cartao>

            <Cartao>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Aparelhos conectados</span>
                <button
                  type="button"
                  onClick={() => {
                    setSessoes((lista) => lista.filter((s) => s.atual));
                    setMensagem('Todas as outras sessões foram encerradas.');
                  }}
                  style={{
                    marginLeft: 'auto',
                    font: 'var(--text-small)',
                    color: 'var(--text-link)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Encerrar as outras
                </button>
              </div>
              {sessoes.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Icon name={s.icone} size={18} color="var(--color-royal)" />
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{s.aparelho}</span>
                    <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{s.meta}</span>
                  </span>
                  {s.atual ? (
                    <StatusBadge tone="confirmed">Este aparelho</StatusBadge>
                  ) : (
                    <Button
                      variant="quiet"
                      onClick={() => {
                        setSessoes((lista) => lista.filter((x) => x.id !== s.id));
                        setMensagem('Sessão encerrada.');
                      }}
                    >
                      Encerrar
                    </Button>
                  )}
                </div>
              ))}
            </Cartao>
          </>
        ) : null}

        {aba === 'avisos' ? (
          <Cartao>
            <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
              Como você quer ser avisado
            </span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1fr) 90px 90px',
                gap: 10,
                alignItems: 'center',
                paddingBottom: 6,
                borderBottom: 'var(--border-hairline)',
              }}
            >
              <span style={rotuloLabel}>Assunto</span>
              <span style={{ ...rotuloLabel, textAlign: 'center' }}>WhatsApp</span>
              <span style={{ ...rotuloLabel, textAlign: 'center' }}>E-mail</span>
            </div>
            {AVISOS.map((a) => (
              <div
                key={a.chave}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1fr) 90px 90px',
                  gap: 10,
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: 'var(--border-hairline)',
                }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{a.titulo}</span>
                  <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{a.quando}</span>
                </span>
                {(['whats', 'email'] as const).map((canal) => (
                  <span key={canal} style={{ display: 'flex', justifyContent: 'center' }}>
                    <Interruptor
                      ligado={avisos[a.chave]![canal]}
                      onAlternar={() =>
                        setAvisos((atual) => ({
                          ...atual,
                          [a.chave]: { ...atual[a.chave]!, [canal]: !atual[a.chave]![canal] },
                        }))
                      }
                      rotuloAcessivel={`${a.titulo} por ${canal === 'whats' ? 'WhatsApp' : 'e-mail'}`}
                    />
                  </span>
                ))}
              </div>
            ))}
          </Cartao>
        ) : null}

        {aba === 'anamnese' ? (
          <>
            <Cartao>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Minha anamnese</span>
                <StatusBadge tone="confirmed">Em dia · v3</StatusBadge>
                <Button
                  iconName="clipboard-list"
                  onClick={() => setMensagem('Formulário v3 aberto. Suas respostas ficam com a direção e a secretaria.')}
                  style={{ marginLeft: 'auto' }}
                >
                  Atualizar respostas
                </Button>
              </div>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                Respondida em 19/06/2026 na versão v3. Vence em 19/06/2027. Só direção e secretaria leem as respostas
                completas.
              </span>

              <div
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
                <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
                  Pressão alta controlada
                </span>
                <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                  losartana 50 mg, acompanhamento semestral
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: 'var(--border-hairline)', paddingTop: 12 }}>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>
                    Mostrar meus pontos de atenção ao guardião do trabalho
                  </span>
                  <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                    {compartilhar
                      ? 'o guardião do trabalho vê os pontos, para poder cuidar'
                      : 'só direção e secretaria veem seus pontos de atenção'}
                  </span>
                </span>
                <Interruptor
                  ligado={compartilhar}
                  onAlternar={() => {
                    setCompartilhar((c) => !c);
                    setMensagem(
                      compartilhar
                        ? 'Só direção e secretaria verão seus pontos de atenção.'
                        : 'O guardião do trabalho passará a ver seus pontos de atenção.',
                    );
                  }}
                  rotuloAcessivel="Mostrar pontos de atenção ao guardião"
                />
              </div>
            </Cartao>

            <Cartao>
              <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Respostas anteriores</span>
              {[
                { data: '19/06/2026', versao: 'v3', resumo: 'pressão alta controlada · sem outras condições', situacao: 'Válida' },
                { data: '04/02/2024', versao: 'v2', resumo: 'sem condições declaradas', situacao: 'Superada' },
              ].map((r) => (
                <div key={r.data} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span
                    style={{ font: 'var(--text-code)', color: 'var(--text-meta)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {r.data}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                    {r.resumo}
                  </span>
                  <StatusBadge tone={r.situacao === 'Válida' ? 'confirmed' : 'neutral'}>
                    {r.versao} · {r.situacao}
                  </StatusBadge>
                </div>
              ))}
            </Cartao>
          </>
        ) : null}
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

function Leitura({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={rotuloLabel}>{rotulo}</span>
      <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{valor}</span>
      {nota ? <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{nota}</span> : null}
    </div>
  );
}
