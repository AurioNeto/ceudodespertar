import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CHAVE_DO_CLIMA, CLIMA_PADRAO, CLIMAS, COR_DO_TEMA_POR_CLIMA } from '../../src/ds/providers/ClimaProvider/constantes';

const INDEX_HTML = readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

const scriptDoClima = (): string => {
  const script = [...INDEX_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map(([, corpo]) => corpo ?? '')
    .find((corpo) => corpo.includes('dataset.clima'));
  if (!script) throw new Error('index.html sem o script que aplica o clima antes do React');
  return script;
};

const climasAlternativos = CLIMAS.map(({ valor }) => valor).filter((valor) => valor !== CLIMA_PADRAO);

describe('script do clima no index.html', () => {
  it('lê a mesma chave do ClimaProvider', () => {
    expect(scriptDoClima()).toContain(`localStorage.getItem('${CHAVE_DO_CLIMA}')`);
  });

  it('o theme-color inicial é a cor do clima padrão', () => {
    expect(INDEX_HTML).toContain(`<meta name="theme-color" content="${COR_DO_TEMA_POR_CLIMA[CLIMA_PADRAO]}" />`);
  });

  it.each(climasAlternativos)('aplica %s com a cor do ClimaProvider', (clima) => {
    const script = scriptDoClima();
    expect(script).toContain(`=== '${clima}'`);
    expect(script).toContain(`dataset.clima = '${clima}'`);
    expect(script).toContain(`setAttribute('content', '${COR_DO_TEMA_POR_CLIMA[clima]}')`);
  });
});
