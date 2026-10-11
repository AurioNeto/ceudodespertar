import { useState } from 'react';
import { Button, Icon, ScreenHeader, useDensidade, SeletorDeTipo } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import {
  lotesIniciais,
  movimentosIniciais,
  reservadoInicial,
  reservasIniciais,
  type LoteDeDaime,
  type MovimentoDeDaime,
} from './mocks/ayahuasca';
import { AbaDeLotes } from './components/AbaDeLotes';
import { AbaDeMovimentos } from './components/AbaDeMovimentos';
import { AbaDeReservas } from './components/AbaDeReservas';
import { FichaDoLote } from './components/FichaDoLote';
import { Kpi } from './components/Kpi';
import { ModalDeMovimento } from './components/ModalDeMovimento';
import type { Aba, RascunhoDeMovimento } from './tipos';
import { litros } from './utils/litros';

const paraNumero = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
};

export function AyahuascaPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const [aba, setAba] = useState<Aba>('lotes');
  const [lotes, setLotes] = useState<readonly LoteDeDaime[]>(lotesIniciais);
  const [movimentos, setMovimentos] = useState<readonly MovimentoDeDaime[]>(movimentosIniciais);
  const [reservado, setReservado] = useState<Record<number, boolean>>({ ...reservadoInicial });
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [form, setForm] = useState<RascunhoDeMovimento | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const emEstoque = lotes.filter((l) => l.situacao !== 'quarentena').reduce((a, l) => a + l.restante, 0);
  const emQuarentena = lotes.filter((l) => l.situacao === 'quarentena').reduce((a, l) => a + l.restante, 0);
  const reservadoTotal = reservasIniciais.filter((r) => reservado[r.id]).reduce((a, r) => a + r.litros, 0);
  const livre = emEstoque - reservadoTotal;
  const previsto = reservasIniciais.reduce((a, r) => a + r.litros, 0);

  const detalhe = lotes.find((l) => l.id === detalheId) ?? null;

  /** O saldo do lote é o guarda-corpo: nenhuma saída passa do que existe. */
  const erroDoFormulario = (f: RascunhoDeMovimento | null): string | null => {
    if (!f) return null;
    const quantidade = paraNumero(f.litros);
    if (f.modo === 'feitio') {
      if (!f.codigo.trim()) return 'Dê um código ao lote (ex.: Lote 01/2027).';
      if (quantidade <= 0) return 'Informe quantos litros entraram.';
      return null;
    }
    const lote = lotes.find((l) => String(l.id) === f.loteId);
    if (!lote) return 'Escolha um lote com daime disponível.';
    if (quantidade <= 0) return 'Informe quantos litros vão sair.';
    if (quantidade > lote.restante) return `${lote.codigo} tem só ${litros(lote.restante)} disponíveis.`;
    if (lote.situacao === 'quarentena') return `${lote.codigo} está em quarentena e não pode sair.`;
    return null;
  };

  const erro = erroDoFormulario(form);

  const salvar = () => {
    if (!form || erro) return;
    const quantidade = paraNumero(form.litros);

    if (form.modo === 'feitio') {
      const novo: LoteDeDaime = {
        id: Date.now(),
        codigo: form.codigo.trim(),
        origem: form.origem.trim() || 'Feitio · CDD',
        data: '02/09/2026',
        forca: form.forca || 'Força 2',
        litros: quantidade,
        restante: quantidade,
        local: 'Casa de feitio',
        guardiao: 'Chico Aguiar',
        situacao: 'lacrado',
        analise: 'aguardando análise',
        garrafas: `${Math.round(quantidade * 2)} garrafas de 500 ml`,
      };
      setLotes((lista) => [novo, ...lista]);
      setMovimentos((lista) => [
        {
          id: Date.now(),
          data: '02/09/2026',
          tipo: 'entrada',
          loteId: novo.id,
          litros: quantidade,
          destino: novo.origem,
          responsavel: 'Chico Aguiar',
        },
        ...lista,
      ]);
      setMensagem(`${novo.codigo} criado com ${litros(quantidade)}.`);
    } else {
      const lote = lotes.find((l) => String(l.id) === form.loteId)!;
      const restante = +(lote.restante - quantidade).toFixed(1);
      setLotes((lista) =>
        lista.map((l) =>
          l.id === lote.id ? { ...l, restante, situacao: restante === 0 ? 'esgotado' : l.situacao } : l,
        ),
      );
      setMovimentos((lista) => [
        {
          id: Date.now(),
          data: '02/09/2026',
          tipo: form.modo === 'saida' ? 'saida' : 'transferencia',
          loteId: lote.id,
          litros: quantidade,
          destino: form.destino.trim() || (form.modo === 'saida' ? 'trabalho' : 'outra unidade'),
          responsavel: 'Aurio Neto',
        },
        ...lista,
      ]);
      setMensagem(
        form.modo === 'saida'
          ? `Baixa de ${litros(quantidade)} em ${lote.codigo}.`
          : `Transferência de ${litros(quantidade)} de ${lote.codigo}.`,
      );
    }
    setForm(null);
  };

  const disponiveis = lotes.filter((l) => l.restante > 0 && l.situacao !== 'quarentena');

  return (
    <>
      <ScreenHeader
        code={campo ? 'E-02' : 'E-02 · Ayahuasca'}
        title="Ayahuasca"
        subtitle={campo ? undefined : 'Lotes, movimentos e reservas por trabalho · CDD'}
        density={densidade}
        actions={
          <>
            <Button
              iconName="plus"
              onClick={() =>
                setForm({ modo: 'feitio', codigo: '', origem: '', forca: 'Força 2', loteId: '', litros: '', destino: '' })
              }
            >
              Entrada de feitio
            </Button>
            <Button
              variant="ghost"
              iconName="minus"
              onClick={() =>
                setForm({
                  modo: 'saida',
                  codigo: '',
                  origem: '',
                  forca: '',
                  loteId: String(disponiveis[0]?.id ?? ''),
                  litros: '',
                  destino: '',
                })
              }
            >
              Registrar saída
            </Button>
            <Button
              variant="ghost"
              iconName="arrow-left-right"
              onClick={() =>
                setForm({
                  modo: 'transferencia',
                  codigo: '',
                  origem: '',
                  forca: '',
                  loteId: String(disponiveis[0]?.id ?? ''),
                  litros: '',
                  destino: '',
                })
              }
            >
              Transferir
            </Button>
          </>
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: campo ? 'repeat(2,minmax(0,1fr))' : 'repeat(auto-fit,minmax(180px,1fr))',
            gap: 12,
          }}
        >
          <Kpi
            rotulo="Em estoque"
            valor={litros(emEstoque)}
            nota={pluralizar(lotes.filter((l) => l.restante > 0).length, 'lote com daime', 'lotes com daime')}
          />
          <Kpi rotulo="Reservado" valor={litros(reservadoTotal)} nota="separado para trabalhos confirmados" cor="var(--text-primary)" />
          <Kpi
            rotulo="Livre"
            valor={litros(livre)}
            nota={livre >= 0 ? 'disponível para novas reservas' : 'reservas passam do estoque'}
            cor={livre >= 0 ? 'var(--color-confirmed)' : 'var(--color-attention)'}
          />
          <Kpi
            rotulo="Previsto até out."
            valor={litros(previsto)}
            nota={pluralizar(reservasIniciais.length, 'trabalho na agenda', 'trabalhos na agenda')}
            cor="var(--text-primary)"
          />
        </div>

        {previsto > emEstoque || emQuarentena > 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--color-pending-soft)',
              border: '1px solid var(--color-pending-border)',
              borderRadius: 'var(--radius)',
              padding: '11px 14px',
            }}
          >
            <Icon name="triangle-alert" size={18} color="var(--color-pending)" />
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>
              {previsto > emEstoque
                ? `Os trabalhos da agenda pedem ${litros(previsto)} e o estoque tem ${litros(emEstoque)}. Faltam ${litros(previsto - emEstoque)} até o bailado de 27/09.`
                : `Há ${litros(emQuarentena)} em quarentena, fora do estoque disponível.`}
            </span>
          </div>
        ) : null}

        <SeletorDeTipo
          opcoes={[
            { valor: 'lotes', label: 'Lotes' },
            { valor: 'movimentos', label: 'Movimentos' },
            { valor: 'reservas', label: 'Reservas' },
          ]}
          valor={aba}
          onEscolher={setAba}
          densidade={densidade}
        />

        {aba === 'lotes' ? <AbaDeLotes lotes={lotes} densidade={densidade} onAbrir={setDetalheId} /> : null}

        {aba === 'movimentos' ? (
          <AbaDeMovimentos movimentos={movimentos} lotes={lotes} densidade={densidade} />
        ) : null}

        {aba === 'reservas' ? (
          <AbaDeReservas
            reservas={reservasIniciais}
            reservado={reservado}
            onAlternar={(r) => {
              setReservado((atual) => ({ ...atual, [r.id]: !atual[r.id] }));
              setMensagem(
                reservado[r.id]
                  ? `Reserva liberada: ${litros(r.litros)} voltam para o livre.`
                  : `${litros(r.litros)} reservados para ${r.nome}.`,
              );
            }}
          />
        ) : null}
      </div>

      {detalhe ? (
        <FichaDoLote
          lote={detalhe}
          movimentos={movimentos.filter((m) => m.loteId === detalhe.id)}
          densidade={densidade}
          onFechar={() => setDetalheId(null)}
          onQuarentena={() => {
            const emQuarentenaAgora = detalhe.situacao === 'quarentena';
            setLotes((lista) =>
              lista.map((l) =>
                l.id === detalhe.id
                  ? { ...l, situacao: emQuarentenaAgora ? (l.restante > 0 ? 'em uso' : 'esgotado') : 'quarentena' }
                  : l,
              ),
            );
            setMensagem(
              emQuarentenaAgora
                ? `${detalhe.codigo} saiu da quarentena.`
                : `${detalhe.codigo} posto em quarentena — fora do estoque disponível.`,
            );
          }}
        />
      ) : null}

      {form ? (
        <ModalDeMovimento
          form={form}
          erro={erro}
          lotes={disponiveis}
          onMudar={setForm}
          onCancelar={() => setForm(null)}
          onSalvar={salvar}
        />
      ) : null}
    </>
  );
}
