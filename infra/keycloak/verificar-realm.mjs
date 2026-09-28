import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MODELO_REALM,
  VARIAVEIS_DE_AMBIENTE,
  compararComEspecificacao,
  extrairPlaceholdersDeAmbiente,
} from './modelo-esperado.mjs';

const diretorioDoScript = dirname(fileURLToPath(import.meta.url));
const raizDoRepositorio = join(diretorioDoScript, '..', '..');
const caminhoDoRealm = join(diretorioDoScript, 'realm-cdd.json');
const caminhoDosTemas = join(diretorioDoScript, 'themes');
const caminhoDoCompose = join(raizDoRepositorio, 'compose.yaml');
const caminhoDoEnvExample = join(raizDoRepositorio, '.env.example');

const falhas = [];

function extrairAmbienteDoServico(textoDoCompose, nomeDoServico) {
  const linhas = textoDoCompose.split('\n');
  const inicioServico = linhas.findIndex((linha) => new RegExp(`^  ${nomeDoServico}:\\s*$`).test(linha));
  if (inicioServico === -1) return null;

  let fimServico = linhas.length;
  for (let indice = inicioServico + 1; indice < linhas.length; indice += 1) {
    if (/^ {0,2}\S/.test(linhas[indice])) {
      fimServico = indice;
      break;
    }
  }
  const blocoServico = linhas.slice(inicioServico, fimServico);

  const inicioAmbiente = blocoServico.findIndex((linha) => /^ {4}environment:\s*$/.test(linha));
  if (inicioAmbiente === -1) return { chaves: [], linhasBrutas: {} };

  let fimAmbiente = blocoServico.length;
  for (let indice = inicioAmbiente + 1; indice < blocoServico.length; indice += 1) {
    if (/^ {1,4}\S/.test(blocoServico[indice])) {
      fimAmbiente = indice;
      break;
    }
  }

  const chaves = [];
  const linhasBrutas = {};
  for (const linha of blocoServico.slice(inicioAmbiente + 1, fimAmbiente)) {
    const combinado = linha.match(/^ {6}([A-Z][A-Z0-9_]*):\s*(.*)$/);
    if (!combinado) continue;
    chaves.push(combinado[1]);
    linhasBrutas[combinado[1]] = combinado[2].trim();
  }
  return { chaves, linhasBrutas };
}

function extrairChavesDoEnvExample(textoDoEnvExample) {
  return textoDoEnvExample
    .split('\n')
    .map((linha) => linha.match(/^([A-Z][A-Z0-9_]*)=/))
    .filter(Boolean)
    .map((combinado) => combinado[1]);
}

function verificarVariaveisDeAmbiente(realm) {
  const placeholdersNoRealm = [...extrairPlaceholdersDeAmbiente(realm)]
    .map((placeholderTexto) => placeholderTexto.slice(2, -1))
    .sort();
  const placeholdersEsperados = [...VARIAVEIS_DE_AMBIENTE.placeholdersDoRealm].sort();
  const placeholdersBatem =
    placeholdersNoRealm.length === placeholdersEsperados.length &&
    placeholdersNoRealm.every((nome, indice) => nome === placeholdersEsperados[indice]);
  if (!placeholdersBatem) {
    falhas.push(
      `realm-cdd.json só pode citar exatamente os placeholders ${JSON.stringify(placeholdersEsperados)}, encontrado ${JSON.stringify(placeholdersNoRealm)}`,
    );
  }

  if (!existsSync(caminhoDoCompose)) {
    falhas.push(`compose.yaml não encontrado em ${caminhoDoCompose}`);
    return;
  }
  const textoDoCompose = readFileSync(caminhoDoCompose, 'utf8');
  const ambienteDoKeycloak = extrairAmbienteDoServico(textoDoCompose, 'keycloak');
  if (!ambienteDoKeycloak) {
    falhas.push('compose.yaml não tem o serviço "keycloak"');
    return;
  }

  const chavesDoCompose = [...ambienteDoKeycloak.chaves].sort();
  const chavesEsperadasDoCompose = [...VARIAVEIS_DE_AMBIENTE.chavesDeAmbienteDoServicoKeycloakNoCompose].sort();
  const composeBate =
    chavesDoCompose.length === chavesEsperadasDoCompose.length &&
    chavesDoCompose.every((chave, indice) => chave === chavesEsperadasDoCompose[indice]);
  if (!composeBate) {
    falhas.push(
      `compose.yaml services.keycloak.environment precisa ter exatamente as chaves ${JSON.stringify(chavesEsperadasDoCompose)}, encontrado ${JSON.stringify(ambienteDoKeycloak.chaves)}`,
    );
  }

  for (const nomeDaVariavel of VARIAVEIS_DE_AMBIENTE.placeholdersDoRealm) {
    const linhaBruta = ambienteDoKeycloak.linhasBrutas[nomeDaVariavel];
    const exigeValorObrigatorio = new RegExp(`^\\$\\{${nomeDaVariavel}:\\?.+\\}$`);
    if (linhaBruta === undefined) {
      falhas.push(`compose.yaml services.keycloak.environment precisa citar ${nomeDaVariavel}`);
    } else if (!exigeValorObrigatorio.test(linhaBruta)) {
      falhas.push(
        `compose.yaml services.keycloak.environment.${nomeDaVariavel} precisa ser "\${${nomeDaVariavel}:?<mensagem>}" (falha rápida se a variável não existir), encontrado "${linhaBruta}"`,
      );
    }
  }

  if (!existsSync(caminhoDoEnvExample)) {
    falhas.push(`.env.example não encontrado em ${caminhoDoEnvExample}`);
    return;
  }
  const chavesDoEnvExample = extrairChavesDoEnvExample(readFileSync(caminhoDoEnvExample, 'utf8'));
  for (const nomeDaVariavel of VARIAVEIS_DE_AMBIENTE.placeholdersDoRealm) {
    if (!chavesDoEnvExample.includes(nomeDaVariavel)) {
      falhas.push(`.env.example precisa declarar ${nomeDaVariavel}=`);
    }
  }
  for (const chave of chavesDoEnvExample) {
    if (chave.startsWith('CDD_KC_') && !VARIAVEIS_DE_AMBIENTE.placeholdersDoRealm.includes(chave)) {
      falhas.push(`.env.example declara "${chave}" (prefixo CDD_KC_) que não é citado por nenhum placeholder do realm`);
    }
  }
}

const realm = JSON.parse(readFileSync(caminhoDoRealm, 'utf8'));

compararComEspecificacao(realm, MODELO_REALM, 'realm', falhas, {
  contexto: {
    existeTema: (nomeDoTema) => existsSync(join(caminhoDosTemas, nomeDoTema, 'login')),
  },
});
verificarVariaveisDeAmbiente(realm);

if (falhas.length > 0) {
  console.error(`verificar-realm: ${falhas.length} regra(s) do realm cdd regrediram`);
  for (const falha of falhas) console.error(`  - ${falha}`);
  process.exit(1);
}

console.log('verificar-realm: todas as regras do realm cdd continuam OK');
