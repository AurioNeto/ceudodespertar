import configuracaoDoWeb from './.dependency-cruiser.web.mjs';

function comSeveridadeError(regra) {
  return Object.assign({}, regra, { severity: 'error' });
}

export default {
  ...configuracaoDoWeb,
  forbidden: configuracaoDoWeb.forbidden.map(comSeveridadeError),
};
