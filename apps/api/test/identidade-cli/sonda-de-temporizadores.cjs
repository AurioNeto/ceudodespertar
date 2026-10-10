const { appendFileSync } = require('node:fs');

const criarIntervaloOriginal = globalThis.setInterval;

globalThis.setInterval = function (callback, atraso, ...restante) {
  appendFileSync(process.env.CDD_SONDA_DE_TEMPORIZADORES, `${atraso}\n`);
  return criarIntervaloOriginal.call(this, callback, atraso, ...restante);
};
