import type { LinkDeInscricao } from '@cdd/contracts';
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
