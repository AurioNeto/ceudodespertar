export abstract class ArmazenamentoDeArquivos {
  abstract gravar(chave: string, conteudo: Buffer, mime: string): Promise<void>;
  abstract urlDeLeitura(chave: string): Promise<string>;
}
