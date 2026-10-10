process.env['CDD_PROCESSO'] = 'cli';

const { executarNoProcesso } = await import('./executar-no-processo.js');

await executarNoProcesso(process.argv.slice(2));
