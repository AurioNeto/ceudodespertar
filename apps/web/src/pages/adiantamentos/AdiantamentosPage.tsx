import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Adiantamento, AdiantamentoId, ContaId, LancamentoId, PessoaId, StatusAdiantamento } from '@cdd/contracts';
import { dataLocal, reais } from '@cdd/contracts';
import { Button, EmptyState, Icon, ScreenHeader, StatusBadge, TextField, TwoAxisGuard, type BadgeTone } from '../../ds';
import { Select } from '../../components/Campo';
import { Cartao, Numero, Recado, Rotulo } from '../../components/Blocos';
import { useDensidade } from '../../lib/useDensidade';
import { formatarData, formatarDinheiro, pluralizar } from '../../lib/formato';
import { id as marcarId } from '../../mocks/ids';
import {
  adiantamentos as adiantamentosIniciais,
  contasInstitucionais,
  contasPessoais,
  diasDesde,
  perspectivas,
  quemAdianta,
  type Perspectiva,
} from '../../mocks/adiantamentos';
import { hoje } from '../../mocks/sessao';

const TOM: Record<StatusAdiantamento, BadgeTone> = {
  AGUARDANDO_AUTORIZACAO: 'pending',
  AUTORIZADO: 'royal',
  RECUSADO: 'attention',
  RESSARCIDO: 'confirmed',
};

const ROTULO: Record<StatusAdiantamento, string> = {
  AGUARDANDO_AUTORIZACAO: 'Aguardando autorização',
  AUTORIZADO: 'A ressarcir',
  RECUSADO: 'Recusado',
  RESSARCIDO: 'Ressarcido',
};

export function AdiantamentosPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const [adiantamentos, setAdiantamentos] = useState<readonly Adiantamento[]>(adiantamentosIniciais);
  const [quem, setQuem] = useState<Perspectiva>(perspectivas[0]!);
  const [recado, setRecado] = useState<string | null>(null);
  const [barrado, setBarrado] = useState<Adiantamento | null>(null);
  const [recusando, setRecusando] = useState<AdiantamentoId | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [ressarcindo, setRessarcindo] = useState<AdiantamentoId | null>(null);
  const [contaRessarcimento, setContaRessarcimento] = useState<string>(contasInstitucionais[0]!.id);
  const [dataRessarcimento, setDataRessarcimento] = useState(hoje);
  const [criando, setCriando] = useState(false);

  const aguardando = adiantamentos.filter((a) => a.status === 'AGUARDANDO_AUTORIZACAO');
  const aRessarcir = adiantamentos.filter((a) => a.status === 'AUTORIZADO');
  const fechados = adiantamentos.filter((a) => a.status === 'RESSARCIDO' || a.status === 'RECUSADO');

  const totalARessarcir = aRessarcir.reduce((s, a) => s + a.valor, 0);
  const maisAntigo = aRessarcir.reduce((maior, a) => Math.max(maior, diasDesde(a.dataDespesa, hoje)), 0);

  const trocarPerspectiva = (chave: string) => {
    setQuem(perspectivas.find((p) => p.chave === chave)!);
    setBarrado(null);
    setRecado(null);
    setRecusando(null);
    setRessarcindo(null);
    setCriando(false);
  };

  /**
   * A1, o coração da tela: a permissão abre a operação, o vínculo a autoriza.
   * Quem tem uma e não a outra não vê erro de sistema — vê o motivo.
   */
  const autorizar = (a: Adiantamento) => {
    if (!quem.vinculoDeAutoridade) {
      setBarrado(a);
      return;
    }
    setAdiantamentos((lista) =>
      lista.map((x) =>
        x.id === a.id
          ? { ...x, status: 'AUTORIZADO', autorizadoPorNome: quem.nome, autorizadoEm: dataLocal(hoje) }
          : x,
      ),
    );
    setBarrado(null);
    setRecado(`Adiantamento de ${a.pessoaNome} autorizado. Entrou na fila de reembolsos da tesouraria.`);
  };

  const recusar = (a: Adiantamento) => {
    if (!motivoRecusa.trim()) return;
    setAdiantamentos((lista) =>
      lista.map((x) => (x.id === a.id ? { ...x, status: 'RECUSADO', recusaMotivo: motivoRecusa.trim() } : x)),
    );
    setRecusando(null);
    setMotivoRecusa('');
    setRecado(`Adiantamento de ${a.pessoaNome} recusado, com o motivo registrado.`);
  };

  const ressarcir = (a: Adiantamento) => {
    const conta = contasInstitucionais.find((c) => c.id === contaRessarcimento)!;
    setAdiantamentos((lista) =>
      lista.map((x) =>
        x.id === a.id
          ? { ...x, status: 'RESSARCIDO', ressarcidoEm: dataLocal(dataRessarcimento), contaRessarcimentoNome: conta.nome }
          : x,
      ),
    );
    setRessarcindo(null);
    setRecado(
      `Ressarcimento de ${formatarDinheiro(a.valor)} a ${a.pessoaNome} registrado como transferência de ${conta.nome}. Nenhuma despesa nova — ela já foi lançada em ${formatarData(a.dataDespesa)}.`,
    );
  };

  const criar = (dados: { pessoaId: string; contaId: string; valor: number; data: string; motivo: string }) => {
    const pessoa = quemAdianta.find((p) => p.id === dados.pessoaId)!;
    const conta = contasPessoais.find((c) => c.id === dados.contaId)!;
    const novo: Adiantamento = {
      id: marcarId<AdiantamentoId>(`a-${Date.now()}`),
      pessoaId: pessoa.id as PessoaId,
      pessoaNome: pessoa.nome,
      contaOrigemId: conta.id as ContaId,
      contaOrigemNome: conta.nome,
      valor: reais(dados.valor / 100),
      dataDespesa: dataLocal(dados.data),
      motivo: dados.motivo,
      categoria: 'A classificar',
      grupo: null,
      lancamentoId: marcarId<LancamentoId>(`x-${Date.now()}`),
      comprovante: null,
      status: 'AGUARDANDO_AUTORIZACAO',
      autorizadoPorNome: null,
      autorizadoEm: null,
      recusaMotivo: null,
      ressarcidoEm: null,
      contaRessarcimentoNome: null,
    };
    setAdiantamentos((lista) => [novo, ...lista]);
    setCriando(false);
    setRecado(`Adiantamento registrado. Aguarda autorização de um padrinho ou madrinha.`);
  };

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-11' : 'F-11 · Adiantamentos e reembolsos'}
        title="Adiantamentos"
        subtitle={campo ? undefined : 'Quem tirou do próprio bolso e ainda não voltou · CDD'}
        density={densidade}
        actions={
          quem.podeRegistrar ? (
            <Button
              variant="ghost"
              iconName="circle-plus"
              density={densidade}
              onClick={() => {
                setCriando((c) => !c);
                setRecado(null);
              }}
            >
              Novo adiantamento
            </Button>
          ) : undefined
        }
      />

      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 18,
          maxWidth: campo ? undefined : 1080,
          minWidth: 0,
        }}
      >
        <SeletorDePerspectiva atual={quem} onTrocar={trocarPerspectiva} campo={campo} />

        <Cartao campo={campo}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: campo ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))',
              gap: 16,
            }}
          >
            <Numero
              rotulo="Aguardando autorização"
              valor={String(aguardando.length)}
              nota={aguardando.length ? formatarDinheiro(aguardando.reduce((s, a) => s + a.valor, 0)) : 'nada parado'}
              cor="var(--color-pending)"
            />
            <Numero
              rotulo="A ressarcir"
              valor={formatarDinheiro(totalARessarcir)}
              nota={maisAntigo > 0 ? `o mais antigo há ${pluralizar(maisAntigo, 'dia')}` : 'nada pendente'}
              destaque
            />
            <Numero rotulo="Fechados" valor={String(fechados.length)} nota="ressarcidos ou recusados" />
          </div>
        </Cartao>

        {recado ? <Recado texto={recado} onFechar={() => setRecado(null)} /> : null}

        {criando && quem.podeRegistrar ? (
          <FormularioDeAdiantamento campo={campo} onConfirmar={criar} onCancelar={() => setCriando(false)} />
        ) : null}

        {/*
          Autorização — bloco governado por permissão. Quem não a tem não recebe
          a lista: ela não é escondida na tela, ela não é consultada.
        */}
        {quem.podeAutorizar ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Rotulo>Aguardando sua autorização</Rotulo>
            {aguardando.length === 0 ? (
              <EmptyState title="Nada aguardando" description="Todo adiantamento registrado já passou por autorização." />
            ) : (
              aguardando.map((a) => (
                <Linha key={a.id} adiantamento={a} campo={campo}>
                  {recusando === a.id ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start', width: '100%' }}>
                      <TextField
                        label="Motivo da recusa"
                        value={motivoRecusa}
                        onChange={(e) => setMotivoRecusa(e.target.value)}
                        placeholder="o que impede de autorizar"
                        style={{ flex: 1, minWidth: 240 }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 24 }}>
                        <Button
                          iconName="check"
                          onClick={() => recusar(a)}
                          disabled={!motivoRecusa.trim()}
                          blockedReason={!motivoRecusa.trim() ? 'A recusa exige um motivo escrito.' : undefined}
                        >
                          Recusar
                        </Button>
                        <Button variant="quiet" onClick={() => setRecusando(null)}>
                          Voltar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button iconName="check" onClick={() => autorizar(a)}>
                        Autorizar
                      </Button>
                      <Button variant="quiet" iconName="circle-x" onClick={() => setRecusando(a.id)}>
                        Recusar
                      </Button>
                    </>
                  )}
                </Linha>
              ))
            )}

            {barrado ? (
              <TwoAxisGuard
                explanation={`Autorizar adiantamento exige vínculo ativo de padrinho ou madrinha na data da despesa. ${quem.nome} tem a permissão do grupo ${quem.grupo}, e a operação mesmo assim falha — porque autoridade espiritual não se concede pela tela de acesso, e sim no cadastro de pessoas.`}
                requirement={`Peça a um padrinho ou madrinha. O adiantamento de ${barrado.pessoaNome}, de ${formatarDinheiro(barrado.valor)}, continua aguardando.`}
              />
            ) : null}
          </section>
        ) : (
          <BlocoAusente
            titulo="A fila de autorização não vem para o seu grupo"
            texto={`Autorizar adiantamento é da Governança e da Administração. ${quem.grupo} não recebe esta lista — ela não é escondida na tela, ela não é consultada no servidor.`}
          />
        )}

        {quem.podeLerReembolsos ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Rotulo>A ressarcir</Rotulo>
            {aRessarcir.length === 0 ? (
              <EmptyState
                title="Ninguém esperando dinheiro de volta"
                description="Todo adiantamento autorizado já foi ressarcido."
              />
            ) : (
              aRessarcir.map((a) => (
                <Linha key={a.id} adiantamento={a} campo={campo} idade={diasDesde(a.dataDespesa, hoje)}>
                  {!quem.podeRessarcir ? (
                    <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>a tesouraria ressarce</span>
                  ) : ressarcindo === a.id ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start', width: '100%' }}>
                      <Select
                        label="Conta de saída"
                        value={contaRessarcimento}
                        options={contasInstitucionais.map((c) => ({ value: c.id, label: c.nome }))}
                        onChange={setContaRessarcimento}
                      />
                      <TextField
                        label="Data"
                        type="date"
                        value={dataRessarcimento}
                        onChange={(e) => setDataRessarcimento(e.target.value)}
                      />
                      <TextField label="Valor" value={formatarDinheiro(a.valor)} readOnly hint="igual ao adiantado" />
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 24 }}>
                        <Button iconName="check" onClick={() => ressarcir(a)}>
                          Confirmar
                        </Button>
                        <Button variant="quiet" onClick={() => setRessarcindo(null)}>
                          Voltar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button iconName="arrow-left-right" onClick={() => setRessarcindo(a.id)}>
                      Ressarcir
                    </Button>
                  )}
                </Linha>
              ))
            )}
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '68ch' }}>
              O ressarcimento é transferência de valor igual ao adiantado, e <b>não gera lançamento novo</b> — a despesa já
              entrou na data em que a pessoa gastou.
            </span>
          </section>
        ) : null}

        {fechados.length ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Rotulo>Fechados</Rotulo>
            {fechados.map((a) => (
              <Linha key={a.id} adiantamento={a} campo={campo} />
            ))}
          </section>
        ) : null}
      </div>
    </>
  );
}

function SeletorDePerspectiva({
  atual,
  onTrocar,
  campo,
}: {
  atual: Perspectiva;
  onTrocar: (chave: string) => void;
  campo: boolean;
}) {
  return (
    <div
      style={{
        border: '1px dashed var(--color-line-gold)',
        borderRadius: 'var(--radius)',
        padding: campo ? '12px 14px' : '13px 16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 200, flex: 1 }}>
        <Rotulo>Protótipo · ver como</Rotulo>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {atual.notaDoVinculo ?? 'Sem vínculo de autoridade no cadastro de pessoas.'}
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          Vale só nesta tela — o menu continua o do seu usuário. Sai com o backend.
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {perspectivas.map((p) => {
          const on = p.chave === atual.chave;
          return (
            <button
              key={p.chave}
              type="button"
              aria-pressed={on}
              onClick={() => onTrocar(p.chave)}
              style={{
                padding: '7px 12px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                border: `1px solid ${on ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
                background: on ? 'var(--color-royal-soft)' : 'var(--bg-card)',
                color: on ? 'var(--color-royal-deep)' : 'var(--text-secondary)',
                font: on ? 'var(--text-body-strong)' : 'var(--text-body)',
                textAlign: 'left',
              }}
            >
              {p.nome}
              <span style={{ display: 'block', font: 'var(--text-small)', color: 'var(--text-meta)' }}>{p.grupo}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BlocoAusente({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-sunken)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius)',
        padding: '15px 17px',
        display: 'flex',
        gap: 12,
      }}
    >
      <Icon name="ban" size={19} color="var(--text-meta)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{titulo}</div>
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '62ch' }}>{texto}</p>
      </div>
    </div>
  );
}

function Linha({
  adiantamento,
  campo,
  idade,
  children,
}: {
  adiantamento: Adiantamento;
  campo: boolean;
  idade?: number;
  children?: ReactNode;
}) {
  const a = adiantamento;
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderLeft: `var(--edge-state) solid ${
          a.status === 'AGUARDANDO_AUTORIZACAO'
            ? 'var(--color-pending)'
            : a.status === 'AUTORIZADO'
              ? 'var(--color-royal)'
              : a.status === 'RECUSADO'
                ? 'var(--color-attention)'
                : 'var(--color-confirmed)'
        }`,
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: campo ? '13px 14px' : '14px 17px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 9 }}>
          <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{a.pessoaNome}</span>
          <StatusBadge tone={TOM[a.status]}>{ROTULO[a.status]}</StatusBadge>
          {idade !== undefined && idade > 30 ? <StatusBadge tone="attention">há {idade} dias</StatusBadge> : null}
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {a.motivo} · {formatarData(a.dataDespesa)} · {a.contaOrigemNome}
        </span>
        {a.autorizadoPorNome ? (
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
            autorizado por {a.autorizadoPorNome} em {formatarData(a.autorizadoEm!)}
            {a.ressarcidoEm ? ` · ressarcido em ${formatarData(a.ressarcidoEm)} por ${a.contaRessarcimentoNome}` : ''}
          </span>
        ) : null}
        {a.recusaMotivo ? (
          <span style={{ font: 'var(--text-small)', color: 'var(--color-attention)' }}>recusado: {a.recusaMotivo}</span>
        ) : null}
      </div>

      <span data-numeric style={{ font: 'var(--text-amount-lg)', color: 'var(--text-primary)' }}>
        {formatarDinheiro(a.valor)}
      </span>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>{children}</div>
    </div>
  );
}

function FormularioDeAdiantamento({
  campo,
  onConfirmar,
  onCancelar,
}: {
  campo: boolean;
  onConfirmar: (d: { pessoaId: string; contaId: string; valor: number; data: string; motivo: string }) => void;
  onCancelar: () => void;
}) {
  const [pessoaId, setPessoaId] = useState<string>(quemAdianta[0]!.id);
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hoje);
  const [motivo, setMotivo] = useState('');

  // A2 e A3 juntas: só aparecem as contas pessoais de quem está adiantando.
  const contasDaPessoa = contasPessoais.filter((c) => c.pessoaId === pessoaId);
  const [contaId, setContaId] = useState<string>(contasDaPessoa[0]?.id ?? '');

  const escolherPessoa = (v: string) => {
    setPessoaId(v);
    setContaId(contasPessoais.find((c) => c.pessoaId === v)?.id ?? '');
  };

  const centavos = Math.round(Number(valor.replace(',', '.')) * 100);
  const valido = Number.isFinite(centavos) && centavos > 0 && motivo.trim().length > 0 && contaId !== '';

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--color-royal-border)',
        borderLeft: 'var(--edge-state) solid var(--color-royal)',
        borderRadius: 'var(--radius)',
        padding: campo ? '15px 16px' : '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 15,
      }}
    >
      <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>Novo adiantamento</span>

      <div style={{ display: 'grid', gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))', gap: 14 }}>
        <Select
          label="Quem adiantou"
          value={pessoaId}
          options={quemAdianta.map((p) => ({ value: p.id, label: p.nome }))}
          onChange={escolherPessoa}
        />
        {contasDaPessoa.length ? (
          <Select
            label="Conta pessoal usada"
            value={contaId}
            options={contasDaPessoa.map((c) => ({ value: c.id, label: c.nome }))}
            onChange={setContaId}
            hint="só as contas dessa pessoa aparecem aqui"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
            <Rotulo>Conta pessoal usada</Rotulo>
            <span style={{ font: 'var(--text-small)', color: 'var(--color-attention)' }}>
              Esta pessoa não tem conta pessoal cadastrada. Adiantamento só sai de conta de terceiro.
            </span>
          </div>
        )}
        <TextField label="Valor" inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
        <TextField label="Data da despesa" type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>

      <TextField
        label="Do que foi a despesa"
        placeholder="o que foi comprado, em uma linha"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <Button
          iconName="check"
          onClick={() => onConfirmar({ pessoaId, contaId, valor: centavos, data, motivo: motivo.trim() })}
          disabled={!valido}
          blockedReason={!valido ? 'Informe conta pessoal, valor maior que zero e a despesa.' : undefined}
        >
          Registrar
        </Button>
        <Button variant="quiet" onClick={onCancelar}>
          Cancelar
        </Button>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '50ch' }}>
          Depois de registrado, precisa da autorização de um padrinho ou madrinha para entrar na fila de reembolso.
        </span>
      </div>
    </div>
  );
}
