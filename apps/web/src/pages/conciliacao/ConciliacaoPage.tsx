import { useState } from 'react';
import type { ReactNode } from 'react';
import type { LancamentoAConciliar, LinhaExtrato, LinhaExtratoId, SugestaoDeCasamento } from '@cdd/contracts';
import { Button, EmptyState, Icon, ScreenHeader, StatusBadge } from '../../ds';
import { Select } from '../../components/Campo';
import { Numero, Recado, Rotulo } from '../../components/Blocos';
import { useDensidade } from '../../lib/useDensidade';
import { formatarData, formatarDinheiro, pluralizar } from '../../lib/formato';
import {
  contasComExtrato,
  importacao,
  lancamentosSozinhos as lancamentosIniciais,
  linhasSozinhas as linhasIniciais,
  motivosDeIgnorar,
  sugestoes as sugestoesIniciais,
} from '../../mocks/conciliacao';

export function ConciliacaoPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const [importado, setImportado] = useState(true);
  const [conta, setConta] = useState<string>(contasComExtrato[0]!.id);
  const [sugestoes, setSugestoes] = useState<readonly SugestaoDeCasamento[]>(sugestoesIniciais);
  const [linhas, setLinhas] = useState<readonly LinhaExtrato[]>(linhasIniciais);
  const [lancamentos, setLancamentos] = useState<readonly LancamentoAConciliar[]>(lancamentosIniciais);
  const [ignorando, setIgnorando] = useState<LinhaExtratoId | null>(null);
  const [motivo, setMotivo] = useState(motivosDeIgnorar[0]!);
  const [recado, setRecado] = useState<string | null>(null);
  const [conciliadas, setConciliadas] = useState(0);
  const [ignoradas, setIgnoradas] = useState(0);

  const casar = (s: SugestaoDeCasamento) => {
    setSugestoes((lista) => lista.filter((x) => x.linha.id !== s.linha.id));
    setConciliadas((n) => n + 1);
    setRecado(
      `Casado. A data de caixa do lançamento “${s.lancamento.motivo}” passou a ser ${formatarData(s.linha.data)}, vinda do extrato — nunca o contrário.`,
    );
  };

  const recusarSugestao = (s: SugestaoDeCasamento) => {
    setSugestoes((lista) => lista.filter((x) => x.linha.id !== s.linha.id));
    setLinhas((lista) => [s.linha, ...lista]);
    setLancamentos((lista) => [s.lancamento, ...lista]);
    setRecado('Sugestão recusada. Os dois voltaram para as colunas de quem está sem par.');
  };

  const ignorar = (l: LinhaExtrato) => {
    setLinhas((lista) => lista.filter((x) => x.id !== l.id));
    setIgnorando(null);
    setIgnoradas((n) => n + 1);
    setRecado(`Linha ignorada com o motivo registrado: “${motivo}”.`);
  };

  const totalPendente = linhas.length + sugestoes.length;

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-25 · F-26' : 'F-25 e F-26 · Importação e conciliação'}
        title="Conciliação"
        subtitle={campo ? undefined : 'O extrato é a verdade bancária; o registro é a intenção · CDD'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 18,
          maxWidth: campo ? undefined : 1320,
          minWidth: 0,
        }}
      >
        <PainelDeImportacao
          campo={campo}
          importado={importado}
          conta={conta}
          onConta={setConta}
          onImportar={() => {
            setImportado(true);
            setRecado(
              `${importacao.linhasLidas} linhas lidas. ${importacao.linhasJaConhecidas} já existiam pelo identificador do banco e não entraram de novo — reimportar o mesmo arquivo não duplica nada.`,
            );
          }}
        />

        {recado ? <Recado texto={recado} onFechar={() => setRecado(null)} /> : null}

        {!importado ? null : (
          <>
            <div
              style={{
                background: 'var(--bg-card)',
                border: 'var(--border-hairline)',
                borderRadius: 'var(--radius)',
                padding: campo ? '15px 16px' : '17px 20px',
                display: 'grid',
                gridTemplateColumns: campo ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))',
                gap: 16,
              }}
            >
              <Numero rotulo="Sem par" valor={String(totalPendente)} nota="linhas e lançamentos a resolver" destaque />
              <Numero rotulo="Sugestões" valor={String(sugestoes.length)} nota="propostas pelo motor" cor="var(--color-suggest)" />
              <Numero rotulo="Conciliadas" valor={String(conciliadas)} nota="nesta sessão" cor="var(--color-confirmed)" />
              <Numero rotulo="Ignoradas" valor={String(ignoradas)} nota="com motivo registrado" />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1.12fr) minmax(0,1fr)',
                gap: campo ? 16 : 18,
                alignItems: 'start',
              }}
            >
              <Coluna
                titulo="Saiu dinheiro que ninguém registrou"
                icone="arrow-down-left"
                cor="var(--color-attention)"
                contagem={linhas.length}
                nota="Linhas do banco sem lançamento correspondente. É o problema de omissão saindo da invisibilidade."
              >
                {linhas.length === 0 ? (
                  <EmptyState title="Nada sobrando do lado do banco" description="Toda linha do extrato encontrou seu par." />
                ) : (
                  linhas.map((l) => (
                    <LinhaDoExtrato
                      key={l.id}
                      linha={l}
                      ignorando={ignorando === l.id}
                      motivo={motivo}
                      onMotivo={setMotivo}
                      onIgnorar={() => ignorar(l)}
                      onAbrirIgnorar={() => setIgnorando(l.id)}
                      onCancelar={() => setIgnorando(null)}
                    />
                  ))
                )}
              </Coluna>

              <Coluna
                titulo="Sugestões de casamento"
                icone="sparkles"
                cor="var(--color-suggest)"
                contagem={sugestoes.length}
                nota="Por valor, proximidade de data e conta. O sistema propõe; quem confirma é você."
              >
                {sugestoes.length === 0 ? (
                  <EmptyState title="Nenhuma sugestão aberta" description="O motor não encontra mais pares prováveis." />
                ) : (
                  sugestoes.map((s) => (
                    <Sugestao key={s.linha.id} sugestao={s} onCasar={() => casar(s)} onRecusar={() => recusarSugestao(s)} />
                  ))
                )}
              </Coluna>

              <Coluna
                titulo="Registramos algo que não saiu do banco"
                icone="arrow-up-right"
                cor="var(--color-pending)"
                contagem={lancamentos.length}
                nota="Lançamentos que o extrato não confirma. Pode ser espécie, cartão, ou erro de conta."
              >
                {lancamentos.length === 0 ? (
                  <EmptyState title="Nada sobrando do lado do sistema" description="Todo lançamento encontrou sua linha." />
                ) : (
                  lancamentos.map((lc) => <LancamentoSozinho key={lc.id} lancamento={lc} />)
                )}
              </Coluna>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function PainelDeImportacao({
  campo,
  importado,
  conta,
  onConta,
  onImportar,
}: {
  campo: boolean;
  importado: boolean;
  conta: string;
  onConta: (v: string) => void;
  onImportar: () => void;
}) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        padding: campo ? '15px 16px' : '17px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'flex-end',
      }}
    >
      <Select
        label="Conta"
        value={conta}
        options={contasComExtrato.map((c) => ({ value: c.id, label: c.nome }))}
        onChange={onConta}
      />

      <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Rotulo>Arquivo do banco</Rotulo>
        <div
          style={{
            border: '1px dashed var(--color-line-strong)',
            borderRadius: 'var(--radius)',
            padding: '10px 13px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minHeight: 'var(--target-office)',
          }}
        >
          <Icon name="paperclip" size={17} color="var(--text-meta)" />
          <span style={{ flex: 1, font: 'var(--text-body)', color: 'var(--text-primary)' }}>{importacao.arquivo}</span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>OFX</span>
        </div>
      </div>

      <Button iconName="file-spreadsheet" onClick={onImportar} density={campo ? 'field' : 'office'}>
        {importado ? 'Reimportar' : 'Importar extrato'}
      </Button>

      {importado ? (
        <div style={{ flexBasis: '100%', display: 'flex', flexWrap: 'wrap', gap: '4px 16px', alignItems: 'baseline' }}>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            {importacao.arquivo} · {formatarData(importacao.periodo.de)} a {formatarData(importacao.periodo.ate)} ·{' '}
            {pluralizar(importacao.linhasLidas, 'linha')} lidas
          </span>
          <span style={{ font: 'var(--text-small)', color: 'var(--color-confirmed)' }}>
            {importacao.linhasJaConhecidas} já existiam e não entraram de novo
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Coluna({
  titulo,
  icone,
  cor,
  contagem,
  nota,
  children,
}: {
  titulo: string;
  icone: 'arrow-down-left' | 'arrow-up-right' | 'sparkles';
  cor: string;
  contagem: number;
  nota: string;
  children: ReactNode;
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Icon name={icone} size={18} color={cor} />
          <span style={{ flex: 1, font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{titulo}</span>
          <span data-numeric style={{ font: 'var(--text-amount)', color: cor }}>
            {contagem}
          </span>
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span>
        <div style={{ height: 2, background: cor, opacity: 0.28, borderRadius: 2 }} />
      </header>
      {children}
    </section>
  );
}

function LinhaDoExtrato({
  linha,
  ignorando,
  motivo,
  onMotivo,
  onIgnorar,
  onAbrirIgnorar,
  onCancelar,
}: {
  linha: LinhaExtrato;
  ignorando: boolean;
  motivo: string;
  onMotivo: (v: string) => void;
  onIgnorar: () => void;
  onAbrirIgnorar: () => void;
  onCancelar: () => void;
}) {
  const credito = linha.sinal === 'CREDITO';
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderLeft: 'var(--edge-state) solid var(--color-attention)',
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {formatarData(linha.data).slice(0, 5)}
        </span>
        <span style={{ flex: 1, minWidth: 0, font: 'var(--text-body)', color: 'var(--text-primary)' }}>
          {linha.descricaoBanco}
        </span>
        <span
          data-numeric
          style={{ font: 'var(--text-amount)', color: credito ? 'var(--color-confirmed)' : 'var(--text-primary)' }}
        >
          {credito ? '+ ' : '− '}
          {formatarDinheiro(linha.valor)}
        </span>
      </div>

      {ignorando ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <Select
            label="Motivo"
            value={motivo}
            options={motivosDeIgnorar.map((m) => ({ value: m, label: m }))}
            onChange={onMotivo}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button iconName="check" onClick={onIgnorar}>
              Ignorar
            </Button>
            <Button variant="quiet" onClick={onCancelar}>
              Voltar
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Button variant="ghost" iconName="circle-plus">
            Registrar lançamento
          </Button>
          <Button variant="quiet" iconName="ban" onClick={onAbrirIgnorar}>
            Ignorar
          </Button>
        </div>
      )}
    </div>
  );
}

function Sugestao({
  sugestao,
  onCasar,
  onRecusar,
}: {
  sugestao: SugestaoDeCasamento;
  onCasar: () => void;
  onRecusar: () => void;
}) {
  const { linha, lancamento, forca, porque } = sugestao;
  return (
    <div
      style={{
        background: 'var(--color-suggest-soft)',
        border: '1px solid var(--color-suggest-border)',
        borderRadius: 'var(--radius)',
        padding: '13px 15px',
        display: 'flex',
        flexDirection: 'column',
        gap: 11,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <StatusBadge tone="suggest">{forca === 'ALTA' ? 'Alta confiança' : 'Média confiança'}</StatusBadge>
        <span style={{ font: 'var(--text-small)', color: 'var(--color-suggest)' }}>{porque}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <Lado
          rotulo="No banco"
          texto={linha.descricaoBanco}
          data={formatarData(linha.data)}
          valor={formatarDinheiro(linha.valor)}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 2 }}>
          <Icon name="arrow-left-right" size={15} color="var(--color-suggest)" />
          <div style={{ flex: 1, height: 1, background: 'var(--color-suggest-border)' }} />
        </div>
        <Lado
          rotulo="No sistema"
          texto={lancamento.motivo}
          data={formatarData(lancamento.data)}
          valor={formatarDinheiro(lancamento.valor)}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Button variant="suggest" iconName="check" onClick={onCasar}>
          Casar
        </Button>
        <Button variant="quiet" iconName="circle-x" onClick={onRecusar}>
          Não é o mesmo
        </Button>
      </div>
    </div>
  );
}

function Lado({ rotulo, texto, data, valor }: { rotulo: string; texto: string; data: string; valor: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', width: 74, flex: '0 0 auto' }}>{rotulo}</span>
      <span style={{ flex: 1, minWidth: 0, font: 'var(--text-body)', color: 'var(--text-primary)' }}>{texto}</span>
      <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
        {data.slice(0, 5)}
      </span>
      <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--text-primary)' }}>
        {valor}
      </span>
    </div>
  );
}

function LancamentoSozinho({ lancamento }: { lancamento: LancamentoAConciliar }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderLeft: 'var(--edge-state) solid var(--color-pending)',
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {formatarData(lancamento.data).slice(0, 5)}
        </span>
        <span style={{ flex: 1, minWidth: 0, font: 'var(--text-body)', color: 'var(--text-primary)' }}>
          {lancamento.motivo}
        </span>
        <span
          data-numeric
          style={{
            font: 'var(--text-amount)',
            color: lancamento.natureza === 'RECEITA' ? 'var(--color-confirmed)' : 'var(--text-primary)',
          }}
        >
          {lancamento.natureza === 'RECEITA' ? '+ ' : '− '}
          {formatarDinheiro(lancamento.valor)}
        </span>
      </div>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
        {lancamento.conta} · {lancamento.registradoPorNome}
      </span>
    </div>
  );
}
