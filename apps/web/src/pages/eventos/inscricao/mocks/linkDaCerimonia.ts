import type { EventoId, LinkDeInscricao } from '@cdd/contracts';
import { dataLocal } from '@cdd/contracts';
import { eventos } from './eventos';

export const eventoDoLink = eventos[0]!;

export const linkDaCerimonia: LinkDeInscricao = {
  eventoId: eventoDoLink.id,
  token: 'lua-cheia-1209-7k3f',
  url: 'ceudodespertar.org/i/lua-cheia-1209-7k3f',
  criadoEm: dataLocal('2026-08-14'),
  inscricoesAbertas: true,
  aberturas: 96,
  inscricoesPeloLink: 34,
};

const linkDaJornada: LinkDeInscricao = {
  eventoId: eventos[1]!.id,
  token: 'jornada-2410-q8m2',
  url: 'ceudodespertar.org/i/jornada-2410-q8m2',
  criadoEm: dataLocal('2026-08-28'),
  inscricoesAbertas: true,
  aberturas: 61,
  inscricoesPeloLink: 14,
};

const linksDasCerimonias: readonly LinkDeInscricao[] = [linkDaCerimonia, linkDaJornada];

export const linkDoEvento = (eventoId: EventoId): LinkDeInscricao =>
  linksDasCerimonias.find((link) => link.eventoId === eventoId)!;
