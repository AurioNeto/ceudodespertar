import { fileURLToPath } from 'node:url';
import configuracaoDoWeb from '../../../../../.dependency-cruiser.web.mjs';

export default {
  ...configuracaoDoWeb,
  options: {
    ...configuracaoDoWeb.options,
    tsConfig: { fileName: fileURLToPath(new URL('./tsconfig.json', import.meta.url)) },
  },
};
