import { useState } from 'react';
import type { Adiantamento, AdiantamentoId, LancamentoId } from '@cdd/contracts';
import { dataLocal } from '@cdd/contracts';
import { id as marcarId } from '@/mocks/ids';
import { hoje } from '@/pages/mocks/relogio';
import { formatarData, formatarDinheiro } from '@/pages/utils/formato';
import {
  adiantamentos as adiantamentosIniciais,
  contasInstitucionais,
  contasPessoais,
  perspectivas,
  quemAdianta,
  type Perspectiva,
} from '../mocks/adiantamentos';
import { diasDesde } from '../utils/diasDesde';
import { montarAdiantamento, type DadosDoNovo } from '../utils/montarAdiantamento';
import { particionarPorStatus } from '../utils/particionarPorStatus';

export function useAdiantamentos() {
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

  const { aguardando, aRessarcir, fechados } = particionarPorStatus(adiantamentos);

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

  const criar = (dados: DadosDoNovo) => {
    const pessoa = quemAdianta.find((p) => p.id === dados.pessoaId)!;
    const conta = contasPessoais.find((c) => c.id === dados.contaId)!;
    const novo = montarAdiantamento({
      id: marcarId<AdiantamentoId>(`a-${Date.now()}`),
      lancamentoId: marcarId<LancamentoId>(`x-${Date.now()}`),
      dados,
      pessoa,
      conta,
    });
    setAdiantamentos((lista) => [novo, ...lista]);
    setCriando(false);
    setRecado(`Adiantamento registrado. Aguarda autorização de um padrinho ou madrinha.`);
  };

  const alternarNovo = () => {
    setCriando((c) => !c);
    setRecado(null);
  };

  const cancelarNovo = () => setCriando(false);
  const fecharRecado = () => setRecado(null);
  const iniciarRecusa = (id: AdiantamentoId) => setRecusando(id);
  const cancelarRecusa = () => setRecusando(null);
  const iniciarRessarcimento = (id: AdiantamentoId) => setRessarcindo(id);
  const cancelarRessarcimento = () => setRessarcindo(null);

  return {
    quem,
    recado,
    barrado,
    recusando,
    motivoRecusa,
    ressarcindo,
    contaRessarcimento,
    dataRessarcimento,
    criando,
    aguardando,
    aRessarcir,
    fechados,
    totalARessarcir,
    maisAntigo,
    trocarPerspectiva,
    autorizar,
    recusar,
    ressarcir,
    criar,
    alternarNovo,
    cancelarNovo,
    fecharRecado,
    iniciarRecusa,
    cancelarRecusa,
    escolherMotivoRecusa: setMotivoRecusa,
    iniciarRessarcimento,
    cancelarRessarcimento,
    escolherContaRessarcimento: setContaRessarcimento,
    escolherDataRessarcimento: setDataRessarcimento,
  };
}
