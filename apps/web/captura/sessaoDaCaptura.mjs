const MODULO_DA_SESSAO_DE_DEMONSTRACAO = '**/src/app/sessaoDeDemonstracao.ts*';

const SESSAO_COMECA_ATIVA = /let ativa = true/;
const CONCLUSAO_DA_ENTRADA = /concluirEntrada:\s*\(\)\s*=>\s*Promise\.resolve\([^)]*\)/;

const trocar = (codigo, padrao, substituto, nome) => {
  if (!padrao.test(codigo)) {
    throw new Error(
      `A sessão de demonstração mudou de forma e a captura não acha "${nome}" em sessaoDeDemonstracao.ts; ajuste captura/sessaoDaCaptura.mjs.`,
    );
  }
  return codigo.replace(padrao, substituto);
};

export const ADAPTACOES_DA_SESSAO = {
  ativa: null,
  'sem-sessao': (codigo) => trocar(codigo, SESSAO_COMECA_ATIVA, 'let ativa = false', 'let ativa = true'),
  'retorno-pendente': (codigo) =>
    trocar(codigo, CONCLUSAO_DA_ENTRADA, 'concluirEntrada: () => new Promise(() => undefined)', 'concluirEntrada'),
  'retorno-recusado': (codigo) =>
    trocar(
      codigo,
      CONCLUSAO_DA_ENTRADA,
      'concluirEntrada: () => Promise.reject(new Error("retorno recusado"))',
      'concluirEntrada',
    ),
};

export async function aplicarSessao(pagina, nomeDaSessao) {
  const adaptar = ADAPTACOES_DA_SESSAO[nomeDaSessao];
  if (adaptar === undefined) throw new Error(`Sessão de captura desconhecida: ${nomeDaSessao}`);

  let falha = null;
  if (adaptar !== null) {
    await pagina.route(MODULO_DA_SESSAO_DE_DEMONSTRACAO, async (rota) => {
      try {
        const resposta = await rota.fetch();
        await rota.fulfill({ response: resposta, body: adaptar(await resposta.text()) });
      } catch (erro) {
        falha = erro;
        await rota.abort();
      }
    });
  }

  return {
    conferir() {
      if (falha) throw falha;
    },
  };
}
