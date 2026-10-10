export interface RespostaDaSessao {
  readonly status: number;
  readonly location: string | null;
  readonly corpo: string;
  readonly urlFinal: string;
}

export interface OpcoesDoPedido {
  readonly metodo?: string;
  readonly corpo?: URLSearchParams;
  readonly seguirRedirecionamentos?: boolean;
}

const LIMITE_DE_REDIRECIONAMENTOS = 10;

function nomeEValor(cookie: string): { nome: string; valor: string; expirado: boolean } {
  const [par = '', ...atributos] = cookie.split(';').map((parte) => parte.trim());
  const separador = par.indexOf('=');
  const nome = par.slice(0, separador);
  const valor = par.slice(separador + 1);
  const expirado = valor === '' || atributos.some((atributo) => /^max-age=0$/i.test(atributo));
  return { nome, valor, expirado };
}

export class SessaoHttp {
  private readonly cookies = new Map<string, string>();

  constructor(private readonly origemPermitida: string) {}

  async pedir(url: string, { metodo = 'GET', corpo, seguirRedirecionamentos = true }: OpcoesDoPedido = {}): Promise<RespostaDaSessao> {
    let atual = url;
    let metodoAtual = metodo;
    let corpoAtual = corpo;
    for (let salto = 0; salto <= LIMITE_DE_REDIRECIONAMENTOS; salto += 1) {
      // eslint-disable-next-line no-await-in-loop -- cada salto depende do anterior
      const resposta = await this.pedirUmaVez(atual, metodoAtual, corpoAtual);
      const location = resposta.headers.get('location');
      const destino = location === null ? null : new URL(location, atual).toString();
      // eslint-disable-next-line no-await-in-loop -- lê o corpo do salto corrente
      const texto = await resposta.text();
      const ehRedirecionamento = resposta.status >= 300 && resposta.status < 400 && destino !== null;
      const podeSeguir = seguirRedirecionamentos && ehRedirecionamento && new URL(destino).origin === this.origemPermitida;
      if (!podeSeguir) return { status: resposta.status, location: destino, corpo: texto, urlFinal: atual };
      atual = destino;
      metodoAtual = 'GET';
      corpoAtual = undefined;
    }
    throw new Error(`mais de ${LIMITE_DE_REDIRECIONAMENTOS} redirecionamentos a partir de ${url}`);
  }

  private async pedirUmaVez(url: string, metodo: string, corpo: URLSearchParams | undefined): Promise<Response> {
    const cabecalhos: Record<string, string> = { cookie: this.cabecalhoDeCookie() };
    if (corpo !== undefined) cabecalhos['content-type'] = 'application/x-www-form-urlencoded';
    const resposta = await fetch(url, {
      method: metodo,
      redirect: 'manual',
      headers: cabecalhos,
      ...(corpo === undefined ? {} : { body: corpo }),
    });
    this.guardarCookies(resposta.headers.getSetCookie());
    return resposta;
  }

  private cabecalhoDeCookie(): string {
    return [...this.cookies].map(([nome, valor]) => `${nome}=${valor}`).join('; ');
  }

  private guardarCookies(recebidos: readonly string[]): void {
    for (const cookie of recebidos) {
      const { nome, valor, expirado } = nomeEValor(cookie);
      if (expirado) this.cookies.delete(nome);
      else this.cookies.set(nome, valor);
    }
  }
}

export interface FormularioHtml {
  readonly acao: string;
  readonly campos: URLSearchParams;
}

function desescaparHtml(texto: string): string {
  return texto.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
}

export function lerFormulario(html: string): FormularioHtml {
  const formulario = /<form\b[^>]*\baction="([^"]+)"[^>]*>([\s\S]*?)<\/form>/i.exec(html);
  if (formulario === null) throw new Error('a página não tem formulário');
  const campos = new URLSearchParams();
  for (const entrada of (formulario[2] ?? '').matchAll(/<input\b[^>]*>/gi)) {
    const nome = /\bname="([^"]*)"/i.exec(entrada[0])?.[1];
    const valor = /\bvalue="([^"]*)"/i.exec(entrada[0])?.[1] ?? '';
    if (nome !== undefined) campos.set(nome, desescaparHtml(valor));
  }
  return { acao: desescaparHtml(formulario[1] ?? ''), campos };
}
