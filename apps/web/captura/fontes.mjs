import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const chaveDaUrl = (url) => createHash('sha256').update(url).digest('hex');

async function lerDoCache(pasta, chave) {
  try {
    const [metadados, corpo] = await Promise.all([
      readFile(join(pasta, `${chave}.json`), 'utf8'),
      readFile(join(pasta, `${chave}.bin`)),
    ]);
    return { ...JSON.parse(metadados), corpo };
  } catch (erro) {
    if (erro.code === 'ENOENT') return null;
    throw erro;
  }
}

async function guardarNoCache(pasta, chave, { status, tipo, corpo }) {
  await mkdir(pasta, { recursive: true });
  await writeFile(join(pasta, `${chave}.bin`), corpo);
  await writeFile(join(pasta, `${chave}.json`), JSON.stringify({ status, tipo }));
}

const responderComOCache = (rota, { status, tipo, corpo }) =>
  rota.fulfill({
    status,
    body: corpo,
    headers: { 'content-type': tipo, 'access-control-allow-origin': '*' },
  });

export function servirFontesDoCache(pasta) {
  return async (rota) => {
    const url = rota.request().url();
    const chave = chaveDaUrl(url);
    const guardada = await lerDoCache(pasta, chave);
    if (guardada) return responderComOCache(rota, guardada);

    const resposta = await rota.fetch();
    if (!resposta.ok()) {
      throw new Error(`Fonte indisponível e sem cópia local: ${url} respondeu ${resposta.status()}`);
    }
    const nova = {
      status: resposta.status(),
      tipo: resposta.headers()['content-type'] ?? 'application/octet-stream',
      corpo: await resposta.body(),
    };
    await guardarNoCache(pasta, chave, nova);
    return responderComOCache(rota, nova);
  };
}
