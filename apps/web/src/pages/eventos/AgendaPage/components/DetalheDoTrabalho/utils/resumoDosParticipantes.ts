import type { ParticipanteDoTrabalho } from '../../../tipos';

export const resumoDosParticipantes = (participantes: readonly ParticipanteDoTrabalho[]) => {
  const confirmados = participantes.filter((p) => p.situacao === 'confirmado');
  const emEspera = participantes.filter((p) => p.situacao === 'espera');
  const visitantes = participantes.filter((p) => p.vinculo === 'Visitante');
  const semAnamnese = participantes.filter((p) => p.anamnese === 'ausente');
  const vencidas = participantes.filter((p) => p.anamnese === 'vencida');
  const emDia = participantes.filter((p) => p.anamnese === 'em dia');
  const comAtencao = participantes.filter((p) => p.atencao);

  return { confirmados, emEspera, visitantes, semAnamnese, vencidas, emDia, comAtencao };
};
