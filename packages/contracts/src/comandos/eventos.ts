import { z } from 'zod';
import { dataLocalValida, textoSemCaractereNulo, uuidEmMinusculas } from '../entrada.js';
import { TIPOS_DE_EVENTO } from '../eventos.js';
import type { EventoId, UnidadeId } from '../kernel.js';

export const CriarEventoMinimo = z.object({
  unidadeId: uuidEmMinusculas<UnidadeId>(),
  nome: textoSemCaractereNulo().trim().min(1).max(120),
  tipo: z.enum(TIPOS_DE_EVENTO),
  dataInicio: dataLocalValida(),
  dataFim: dataLocalValida(),
}).refine(dados => dados.dataFim >= dados.dataInicio, {
  path: ['dataFim'],
  message: 'A data final deve ser igual ou posterior à data inicial',
});
export type CriarEventoMinimo = z.infer<typeof CriarEventoMinimo>;

export const ParametrosDoEvento = z.object({ id: uuidEmMinusculas<EventoId>() });
export type ParametrosDoEvento = z.infer<typeof ParametrosDoEvento>;
