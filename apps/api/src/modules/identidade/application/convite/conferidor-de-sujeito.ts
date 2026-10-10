export class ProvedorDeIdentidadeIndisponivel extends Error {
  constructor(readonly diagnostico: string) {
    super(`ProvedorDeIdentidadeIndisponivel: ${diagnostico}`);
    this.name = 'ProvedorDeIdentidadeIndisponivel';
  }
}

export abstract class ConferidorDeSujeito {
  abstract emailDo(sujeito: string): Promise<string | undefined>;
}
