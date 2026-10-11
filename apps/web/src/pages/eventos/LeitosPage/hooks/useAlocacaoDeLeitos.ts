import { useMemo, useState } from 'react';
import type { Dormitorio } from '@cdd/contracts';
import {
  alocacaoInicial,
  conflitoDeAgenda,
  dormitorios as dormitoriosIniciais,
  eventoDoMapa,
  foraDoMapa,
  hospedes,
  type NoiteId,
} from '../mocks/leitos';
import type { Aba, Alocacao } from '../tipos';
import { identificacaoDe } from '../utils/leitos';
import { rotuloDaNoite } from '../utils/noites';
import {
  comOcupante,
  noitesOcupadasDoLeito,
  pendenciasDosHospedes,
  semOcupante,
  vagasNoiteOcupadas,
} from '../utils/ocupacao';

export function useAlocacaoDeLeitos() {
  const [aba, setAba] = useState<Aba>('mapa');
  const [dormitorios, setDormitorios] = useState<readonly Dormitorio[]>(dormitoriosIniciais);
  const [alocacao, setAlocacao] = useState<Alocacao>(
    () => JSON.parse(JSON.stringify(alocacaoInicial)) as Alocacao,
  );
  const [escolhendo, setEscolhendo] = useState<{ leitoId: string; noite: NoiteId } | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  const ocupantesDe = (leitoId: string, noite: string): readonly string[] => alocacao[leitoId]?.[noite] ?? [];

  const pendencias = useMemo(() => pendenciasDosHospedes(hospedes, alocacao), [alocacao]);

  const semLeito = pendencias.filter((p) => p.faltam.length > 0);

  const leitosAtivos = dormitorios.flatMap((d) => d.leitos.filter((l) => l.ativo));
  const capacidadeTotal = leitosAtivos.reduce((s, l) => s + l.capacidade, 0);
  const vagas = capacidadeTotal * eventoDoMapa.noites.length;
  const ocupadas = vagasNoiteOcupadas(alocacao);
  const dormemNaIgreja = foraDoMapa.filter((x) => x.hospedagem === 'COLCHONETE').length;

  const alocar = (leitoId: string, noite: NoiteId, inscricaoId: string, nome: string) => {
    setAlocacao((a) => comOcupante(a, leitoId, noite, inscricaoId));
    setEscolhendo(null);
    const emConflito = noite === conflitoDeAgenda.noite;
    setRecado(
      emConflito
        ? `${nome} alocada em ${identificacaoDe(dormitorios, leitoId)} na ${rotuloDaNoite(noite)}. Atenção: o ${conflitoDeAgenda.evento} usa o mesmo local nessa noite, e o sistema não impede a sobreposição — confirme com quem organiza.`
        : `${nome} alocada em ${identificacaoDe(dormitorios, leitoId)} na ${rotuloDaNoite(noite)}.`,
    );
  };

  const liberar = (leitoId: string, noite: string, inscricaoId: string) => {
    setAlocacao((a) => semOcupante(a, leitoId, noite, inscricaoId));
    setRecado(null);
  };

  const escolherAba = (v: Aba) => {
    setAba(v);
    setEscolhendo(null);
    setRecado(null);
  };

  const escolherLeito = (leitoId: string, noite: NoiteId) => {
    setEscolhendo({ leitoId, noite });
    setRecado(null);
  };

  const fecharEscolha = () => setEscolhendo(null);

  const fecharRecado = () => setRecado(null);

  const noitesOcupadas = (leitoId: string) => noitesOcupadasDoLeito(alocacao, leitoId);

  return {
    aba,
    dormitorios,
    escolhendo,
    recado,
    pendencias,
    semLeito,
    leitosAtivos,
    capacidadeTotal,
    vagas,
    ocupadas,
    dormemNaIgreja,
    ocupantesDe,
    noitesOcupadas,
    alocar,
    liberar,
    escolherAba,
    escolherLeito,
    fecharEscolha,
    fecharRecado,
    mudarDormitorios: setDormitorios,
    mostrarRecado: setRecado,
  };
}
