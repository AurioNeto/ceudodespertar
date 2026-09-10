import { useState } from 'react';
import type { DevolucaoEmprestimoId, DirecaoEmprestimo, Emprestimo, EmprestimoId, PessoaId } from '@cdd/contracts';
import { dataLocal, reais } from '@cdd/contracts';
import { id as marcarId } from '../../mocks/ids';
import { Button, DomainError, EmptyState, Icon, ScreenHeader, StatusBadge, TextField } from '../../ds';
import { Select, SeletorDeTipo } from '../../components/Campo';
import { BarraDeProporcao, Cartao, Numero, Recado, Rotulo, Td, Th } from '../../components/Blocos';
import { useDensidade } from '../../lib/useDensidade';
import { formatarData, formatarDinheiro, pluralizar } from '../../lib/formato';
import {
  contasDeEmprestimo,
  contrapartesConhecidas,
  devolvido,
  emprestimos as emprestimosIniciais,
  quitado,
  saldoDevedor,
} from '../../mocks/emprestimos';
import { hoje } from '../../mocks/sessao';

type Filtro = 'todos' | 'CONCEDIDO' | 'RECEBIDO' | 'quitados';

const DIRECAO: Record<DirecaoEmprestimo, { rotulo: string; verbo: string; saldoRotulo: string }> = {
  CONCEDIDO: { rotulo: 'Concedido', verbo: 'A casa emprestou', saldoRotulo: 'A receber' },
  RECEBIDO: { rotulo: 'Recebido', verbo: 'A casa tomou', saldoRotulo: 'A devolver' },
};

export function EmprestimosPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const [emprestimos, setEmprestimos] = useState<readonly Emprestimo[]>(emprestimosIniciais);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [abertoId, setAbertoId] = useState(emprestimosIniciais[0]!.id);
  const [devolvendo, setDevolvendo] = useState(false);
  const [valorDevolucao, setValorDevolucao] = useState('');
  const [dataDevolucao, setDataDevolucao] = useState(hoje);
  const [contaDevolucao, setContaDevolucao] = useState<string>(contasDeEmprestimo[0]!.id);
  const [recado, setRecado] = useState<string | null>(null);

  const [criando, setCriando] = useState(false);
  const [novo, setNovo] = useState({
    direcao: 'CONCEDIDO' as DirecaoEmprestimo,
    contraparteId: contrapartesConhecidas[0]!.id as string,
    valor: '',
    data: hoje,
    conta: contasDeEmprestimo[0]!.id as string,
    motivo: '',
  });

  const valorNovoEmCentavos = Math.round(Number(novo.valor.replace(',', '.')) * 100);
  const novoValido =
    Number.isFinite(valorNovoEmCentavos) && valorNovoEmCentavos > 0 && novo.motivo.trim().length > 0;

  const criarEmprestimo = () => {
    if (!novoValido) return;
    const conta = contasDeEmprestimo.find((c) => c.id === novo.conta)!;
    const contraparte = contrapartesConhecidas.find((c) => c.id === novo.contraparteId)!;
    const criado: Emprestimo = {
      id: marcarId<EmprestimoId>(`e-${Date.now()}`),
      direcao: novo.direcao,
      contraparteId: contraparte.id as PessoaId,
      contraparteNome: contraparte.nome,
      valorPrincipal: reais(valorNovoEmCentavos / 100),
      dataConcessao: dataLocal(novo.data),
      contaId: conta.id,
      contaNome: conta.nome,
      motivo: novo.motivo.trim(),
      observacao: null,
      devolucoes: [],
    };
    setEmprestimos((lista) => [criado, ...lista]);
    setAbertoId(criado.id);
    setFiltro('todos');
    setCriando(false);
    setNovo((n) => ({ ...n, valor: '', motivo: '' }));
    setRecado(
      novo.direcao === 'CONCEDIDO'
        ? `Empréstimo registrado. A saída de ${formatarDinheiro(valorNovoEmCentavos)} é transferência para ${contraparte.nome}, não despesa.`
        : `Empréstimo registrado. A entrada de ${formatarDinheiro(valorNovoEmCentavos)} é transferência de ${contraparte.nome}, não receita.`,
    );
  };

  const aReceber = emprestimos.filter((e) => e.direcao === 'CONCEDIDO').reduce((s, e) => s + saldoDevedor(e), 0);
  const aDevolver = emprestimos.filter((e) => e.direcao === 'RECEBIDO').reduce((s, e) => s + saldoDevedor(e), 0);
  const quitados = emprestimos.filter(quitado);

  const visiveis = emprestimos.filter((e) => {
    if (filtro === 'todos') return true;
    if (filtro === 'quitados') return quitado(e);
    return e.direcao === filtro && !quitado(e);
  });

  const aberto = visiveis.find((e) => e.id === abertoId) ?? visiveis[0];

  const saldo = aberto ? saldoDevedor(aberto) : 0;
  const valorEmCentavos = Math.round(Number(valorDevolucao.replace(',', '.')) * 100);
  const valorValido = Number.isFinite(valorEmCentavos) && valorEmCentavos > 0;
  const excedeSaldo = valorValido && valorEmCentavos > saldo;

  const registrarDevolucao = () => {
    if (!aberto || !valorValido || excedeSaldo) return;
    const conta = contasDeEmprestimo.find((c) => c.id === contaDevolucao)!;
    setEmprestimos((lista) =>
      lista.map((e) =>
        e.id === aberto.id
          ? {
              ...e,
              devolucoes: [
                ...e.devolucoes,
                {
                  id: marcarId<DevolucaoEmprestimoId>(`d-${e.id}-${e.devolucoes.length + 1}`),
                  valor: reais(valorEmCentavos / 100),
                  data: dataLocal(dataDevolucao),
                  contaId: conta.id,
                  contaNome: conta.nome,
                  registradoPorNome: 'Aurio Neto',
                },
              ],
            }
          : e,
      ),
    );
    const sobra = saldo - valorEmCentavos;
    setDevolvendo(false);
    setValorDevolucao('');
    setRecado(
      sobra === 0
        ? 'Devolução registrada e empréstimo quitado. A transferência entrou; nenhum lançamento de receita foi criado.'
        : `Devolução registrada como transferência. Restam ${formatarDinheiro(sobra)}.`,
    );
  };

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-10' : 'F-10 · Empréstimos'}
        title="Empréstimos"
        subtitle={campo ? undefined : 'Movimentação patrimonial: não é receita nem despesa · CDD'}
        density={densidade}
        actions={
          <Button
            variant="ghost"
            iconName="circle-plus"
            density={densidade}
            onClick={() => {
              setCriando((c) => !c);
              setDevolvendo(false);
              setRecado(null);
            }}
          >
            Novo empréstimo
          </Button>
        }
      />

      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 18,
          maxWidth: campo ? undefined : 1180,
          minWidth: 0,
        }}
      >
        <Cartao campo={campo}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: campo ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))',
              gap: 16,
            }}
          >
            <Numero
              rotulo="A receber"
              valor={formatarDinheiro(aReceber)}
              nota="emprestado e ainda não devolvido"
              destaque
            />
            <Numero
              rotulo="A devolver"
              valor={formatarDinheiro(aDevolver)}
              nota="a casa tomou e ainda deve"
              cor="var(--color-pending)"
            />
            <Numero
              rotulo="Quitados"
              valor={String(quitados.length)}
              nota={quitados.length ? quitados.map((e) => e.contraparteNome).join(' · ') : 'nenhum ainda'}
            />
          </div>
        </Cartao>

        {recado ? <Recado texto={recado} onFechar={() => setRecado(null)} /> : null}

        {criando ? (
          <FormularioDeEmprestimo
            campo={campo}
            valores={novo}
            valido={novoValido}
            onMudar={(campoNome, valor) => setNovo((n) => ({ ...n, [campoNome]: valor }))}
            onConfirmar={criarEmprestimo}
            onCancelar={() => setCriando(false)}
          />
        ) : null}

        <SeletorDeTipo
          opcoes={[
            { valor: 'todos', label: 'Todos' },
            { valor: 'CONCEDIDO', label: 'Concedidos' },
            { valor: 'RECEBIDO', label: 'Recebidos' },
            { valor: 'quitados', label: 'Quitados' },
          ]}
          valor={filtro}
          onEscolher={(v) => {
            setFiltro(v);
            setDevolvendo(false);
          }}
          densidade={densidade}
        />

        {visiveis.length === 0 ? (
          <EmptyState
            title="Nenhum empréstimo neste recorte"
            description="Troque o filtro acima, ou registre o primeiro empréstimo desta direção."
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: campo ? 'minmax(0,1fr)' : '300px minmax(0,1fr)',
              gap: campo ? 14 : 20,
              alignItems: 'start',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visiveis.map((e) => (
                <LinhaDoEmprestimo
                  key={e.id}
                  emprestimo={e}
                  ativo={e.id === aberto?.id}
                  onAbrir={() => {
                    setAbertoId(e.id);
                    setDevolvendo(false);
                    setRecado(null);
                  }}
                />
              ))}
            </div>

            {aberto ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                <Detalhe emprestimo={aberto} campo={campo} />

                <DomainError
                  rule="Emprestar e devolver não mexem no resultado do mês"
                  explanation="O dinheiro sai e volta do patrimônio da casa: não é despesa quando sai, nem receita quando volta. Os dois lados são transferências entre contas."
                  way="Era assim que a planilha errava — o empréstimo entrava como despesa e a devolução como receita, e o mês fechava torto nas duas pontas."
                />

                <TabelaDeDevolucoes emprestimo={aberto} campo={campo} />

                {quitado(aberto) ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, font: 'var(--text-small)', color: 'var(--color-confirmed)' }}>
                    <Icon name="circle-check" size={16} />
                    Quitado. A soma das devoluções fechou com o principal.
                  </div>
                ) : devolvendo ? (
                  <FormularioDeDevolucao
                    campo={campo}
                    saldo={saldo}
                    direcao={aberto.direcao}
                    valor={valorDevolucao}
                    data={dataDevolucao}
                    conta={contaDevolucao}
                    excedeSaldo={excedeSaldo}
                    valorValido={valorValido}
                    onValor={setValorDevolucao}
                    onData={setDataDevolucao}
                    onConta={setContaDevolucao}
                    onConfirmar={registrarDevolucao}
                    onCancelar={() => {
                      setDevolvendo(false);
                      setValorDevolucao('');
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                    <Button iconName="undo-2" onClick={() => setDevolvendo(true)}>
                      Registrar devolução
                    </Button>
                    <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                      Saldo de {formatarDinheiro(saldo)} · grava uma transferência.
                    </span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}

interface ValoresDoNovo {
  direcao: DirecaoEmprestimo;
  contraparteId: string;
  valor: string;
  data: string;
  conta: string;
  motivo: string;
}

function FormularioDeEmprestimo({
  campo,
  valores,
  valido,
  onMudar,
  onConfirmar,
  onCancelar,
}: {
  campo: boolean;
  valores: ValoresDoNovo;
  valido: boolean;
  onMudar: <K extends keyof ValoresDoNovo>(campo: K, valor: ValoresDoNovo[K]) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const concedido = valores.direcao === 'CONCEDIDO';

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
      <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>Novo empréstimo</span>

      <SeletorDeTipo
        opcoes={[
          { valor: 'CONCEDIDO', label: 'A casa empresta' },
          { valor: 'RECEBIDO', label: 'A casa toma emprestado' },
        ]}
        valor={valores.direcao}
        onEscolher={(v) => onMudar('direcao', v)}
        densidade={campo ? 'field' : 'office'}
      />

      <div style={{ display: 'grid', gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))', gap: 14 }}>
        <Select
          label={concedido ? 'Para quem' : 'De quem'}
          value={valores.contraparteId}
          options={contrapartesConhecidas.map((c) => ({ value: c.id, label: c.nome }))}
          onChange={(v) => onMudar('contraparteId', v)}
          hint="quem não estiver na lista precisa de cadastro em Pessoas"
        />
        <Select
          label={concedido ? 'Conta de saída' : 'Conta de entrada'}
          value={valores.conta}
          options={contasDeEmprestimo.map((c) => ({ value: c.id, label: c.nome }))}
          onChange={(v) => onMudar('conta', v)}
        />
        <TextField
          label="Valor"
          inputMode="decimal"
          placeholder="0,00"
          value={valores.valor}
          onChange={(e) => onMudar('valor', e.target.value)}
        />
        <TextField label="Data" type="date" value={valores.data} onChange={(e) => onMudar('data', e.target.value)} />
      </div>

      <TextField
        label="Motivo"
        placeholder="por que a casa emprestou, em uma linha"
        value={valores.motivo}
        onChange={(e) => onMudar('motivo', e.target.value)}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <Button
          iconName="check"
          onClick={onConfirmar}
          disabled={!valido}
          blockedReason={!valido ? 'Informe um valor maior que zero e o motivo.' : undefined}
        >
          Registrar empréstimo
        </Button>
        <Button variant="quiet" onClick={onCancelar}>
          Cancelar
        </Button>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '50ch' }}>
          {concedido
            ? 'Grava uma transferência de saída. Não entra como despesa no mês.'
            : 'Grava uma transferência de entrada. Não entra como receita no mês.'}
        </span>
      </div>
    </div>
  );
}

function LinhaDoEmprestimo({
  emprestimo,
  ativo,
  onAbrir,
}: {
  emprestimo: Emprestimo;
  ativo: boolean;
  onAbrir: () => void;
}) {
  const saldo = saldoDevedor(emprestimo);
  const estaQuitado = saldo === 0;

  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-current={ativo ? 'true' : undefined}
      style={{
        textAlign: 'left',
        background: ativo ? 'var(--color-royal-soft)' : 'var(--bg-card)',
        border: `1px solid ${ativo ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
        borderRadius: 'var(--radius)',
        padding: '12px 14px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon
          name={emprestimo.direcao === 'CONCEDIDO' ? 'arrow-up-right' : 'arrow-down-left'}
          size={16}
          color={emprestimo.direcao === 'CONCEDIDO' ? 'var(--color-royal)' : 'var(--color-pending)'}
        />
        <span style={{ flex: 1, font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          {emprestimo.contraparteNome}
        </span>
        {estaQuitado ? <StatusBadge tone="confirmed">Quitado</StatusBadge> : null}
      </span>

      <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          data-numeric
          style={{ font: 'var(--text-amount)', color: estaQuitado ? 'var(--text-meta)' : 'var(--text-primary)' }}
        >
          {formatarDinheiro(estaQuitado ? emprestimo.valorPrincipal : saldo)}
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {estaQuitado ? 'devolvido por inteiro' : DIRECAO[emprestimo.direcao].saldoRotulo.toLowerCase()}
        </span>
      </span>

      <BarraDeProporcao
        parte={devolvido(emprestimo)}
        total={emprestimo.valorPrincipal}
        cor={estaQuitado ? 'var(--color-confirmed)' : 'var(--color-royal)'}
      />
    </button>
  );
}

function Detalhe({ emprestimo, campo }: { emprestimo: Emprestimo; campo: boolean }) {
  const d = DIRECAO[emprestimo.direcao];
  const saldo = saldoDevedor(emprestimo);

  return (
    <Cartao campo={campo}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 12px' }}>
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{emprestimo.contraparteNome}</span>
        <StatusBadge tone={emprestimo.direcao === 'CONCEDIDO' ? 'royal' : 'pending'}>{d.rotulo}</StatusBadge>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {d.verbo} em {formatarData(emprestimo.dataConcessao)} · {emprestimo.motivo}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: campo ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))',
          gap: 14,
        }}
      >
        <Numero rotulo="Principal" valor={formatarDinheiro(emprestimo.valorPrincipal)} />
        <Numero rotulo="Já devolvido" valor={formatarDinheiro(devolvido(emprestimo))} cor="var(--color-confirmed)" />
        <Numero
          rotulo={d.saldoRotulo}
          valor={formatarDinheiro(saldo)}
          destaque
          cor={saldo === 0 ? 'var(--color-confirmed)' : undefined}
        />
        <Numero rotulo="Conta de origem" valor={emprestimo.contaNome} />
      </div>

      <BarraDeProporcao
        parte={devolvido(emprestimo)}
        total={emprestimo.valorPrincipal}
        cor={saldo === 0 ? 'var(--color-confirmed)' : 'var(--color-royal)'}
      />

      {emprestimo.observacao ? (
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{emprestimo.observacao}</span>
      ) : null}
    </Cartao>
  );
}

function TabelaDeDevolucoes({ emprestimo, campo }: { emprestimo: Emprestimo; campo: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <Rotulo>Devoluções</Rotulo>
      {emprestimo.devolucoes.length === 0 ? (
        <EmptyState
          title="Nenhuma devolução ainda"
          description="Cada devolução entra aqui com a transferência que a acompanha."
        />
      ) : (
        <div
          style={{
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius)',
            background: 'var(--bg-card)',
            overflowX: 'auto',
          }}
        >
          <table
            style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--text-small)', minWidth: campo ? 420 : undefined }}
          >
            <thead>
              <tr style={{ background: 'var(--bg-sunken)' }}>
                <Th>Data</Th>
                <Th>Conta</Th>
                {campo ? null : <Th>Quem registrou</Th>}
                <Th alinharDireita>Valor</Th>
              </tr>
            </thead>
            <tbody>
              {emprestimo.devolucoes.map((dv) => (
                <tr key={dv.id} style={{ borderTop: '1px solid var(--color-line)' }}>
                  <Td>
                    <span data-numeric>{formatarData(dv.data)}</span>
                  </Td>
                  <Td>{dv.contaNome}</Td>
                  {campo ? null : <Td>{dv.registradoPorNome}</Td>}
                  <Td alinharDireita>
                    <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--color-confirmed)' }}>
                      {formatarDinheiro(dv.valor)}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
        {pluralizar(emprestimo.devolucoes.length, 'devolução', 'devoluções')} · a soma nunca passa do principal.
      </span>
    </div>
  );
}

function FormularioDeDevolucao({
  campo,
  saldo,
  direcao,
  valor,
  data,
  conta,
  excedeSaldo,
  valorValido,
  onValor,
  onData,
  onConta,
  onConfirmar,
  onCancelar,
}: {
  campo: boolean;
  saldo: number;
  direcao: DirecaoEmprestimo;
  valor: string;
  data: string;
  conta: string;
  excedeSaldo: boolean;
  valorValido: boolean;
  onValor: (v: string) => void;
  onData: (v: string) => void;
  onConta: (v: string) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
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
      <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>
        {direcao === 'CONCEDIDO' ? 'Registrar o que voltou' : 'Registrar o que a casa devolveu'}
      </span>

      <div style={{ display: 'grid', gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(3, minmax(0,1fr))', gap: 14 }}>
        <TextField
          label="Valor"
          inputMode="decimal"
          placeholder="0,00"
          value={valor}
          onChange={(e) => onValor(e.target.value)}
          error={excedeSaldo ? `Passa do saldo de ${formatarDinheiro(saldo)}.` : undefined}
          hint={excedeSaldo ? undefined : `saldo de ${formatarDinheiro(saldo)}`}
          autoFocus
        />
        <TextField label="Data" type="date" value={data} onChange={(e) => onData(e.target.value)} />
        <Select
          label={direcao === 'CONCEDIDO' ? 'Conta de entrada' : 'Conta de saída'}
          value={conta}
          options={contasDeEmprestimo.map((c) => ({ value: c.id, label: c.nome }))}
          onChange={onConta}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <Button
          iconName="check"
          onClick={onConfirmar}
          disabled={!valorValido || excedeSaldo}
          blockedReason={
            excedeSaldo
              ? 'A soma das devoluções não pode passar do principal emprestado.'
              : !valorValido && valor.length > 0
                ? 'Informe um valor maior que zero.'
                : undefined
          }
        >
          Registrar devolução
        </Button>
        <Button variant="quiet" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
