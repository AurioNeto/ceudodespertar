export abstract class LocalizadorDeSujeito {
  abstract subDoUsuario(username: string): Promise<string | undefined>;
}
