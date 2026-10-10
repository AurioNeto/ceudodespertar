const PRAZO_PADRAO_EM_MS = 20_000;
const INTERVALO_EM_MS = 250;

export interface MensagemDoMailpit {
  readonly id: string;
  readonly assunto: string;
  readonly para: readonly string[];
  readonly texto: string;
  readonly html: string;
}

interface ResumoBruto {
  readonly ID: string;
  readonly Created: string;
}

interface MensagemBruta {
  readonly ID: string;
  readonly Subject: string;
  readonly To: ReadonlyArray<{ Address: string }>;
  readonly Text: string;
  readonly HTML: string;
}

function pausar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

export class Mailpit {
  constructor(private readonly urlBase: string) {}

  async mensagensPara(email: string): Promise<MensagemDoMailpit[]> {
    const consulta = new URLSearchParams({ query: `to:${email}` });
    const resposta = await fetch(`${this.urlBase}/api/v1/search?${consulta}`);
    if (!resposta.ok) throw new Error(`Mailpit respondeu ${resposta.status} na busca`);
    const { messages } = (await resposta.json()) as { messages: ResumoBruto[] };
    const doMaisAntigoParaOMaisNovo = messages.toSorted((a, b) => Date.parse(a.Created) - Date.parse(b.Created));
    return Promise.all(doMaisAntigoParaOMaisNovo.map((resumo) => this.ler(resumo.ID)));
  }

  async aguardarMensagensPara(email: string, quantidade: number, prazoEmMs = PRAZO_PADRAO_EM_MS): Promise<MensagemDoMailpit[]> {
    const limite = Date.now() + prazoEmMs;
    let encontradas = await this.mensagensPara(email);
    while (encontradas.length < quantidade && Date.now() < limite) {
      // eslint-disable-next-line no-await-in-loop -- polling até o e-mail chegar
      await pausar(INTERVALO_EM_MS);
      // eslint-disable-next-line no-await-in-loop -- polling até o e-mail chegar
      encontradas = await this.mensagensPara(email);
    }
    if (encontradas.length < quantidade) {
      throw new Error(`esperava ${quantidade} e-mail(s) para ${email} no Mailpit, chegaram ${encontradas.length}`);
    }
    return encontradas;
  }

  private async ler(id: string): Promise<MensagemDoMailpit> {
    const resposta = await fetch(`${this.urlBase}/api/v1/message/${id}`);
    if (!resposta.ok) throw new Error(`Mailpit respondeu ${resposta.status} ao ler a mensagem ${id}`);
    const bruta = (await resposta.json()) as MensagemBruta;
    return {
      id: bruta.ID,
      assunto: bruta.Subject,
      para: bruta.To.map(({ Address }) => Address),
      texto: bruta.Text,
      html: bruta.HTML,
    };
  }
}

export function extrairLinks(corpo: string): string[] {
  const links = corpo.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
  return links.map((link) => link.replaceAll('&amp;', '&'));
}
