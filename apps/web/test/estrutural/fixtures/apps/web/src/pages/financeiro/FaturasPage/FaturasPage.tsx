import * as button from '@/ds/atoms/Button';
import * as erros from '@/dados/erros';
import * as layout from '@/app/shell/Layout';
import * as emprestimosPage from '../EmprestimosPage';
import * as devolucoesPage from '@/pages/eventos/DevolucoesPage';
import * as tabelaDeCompras from './components/DetalheDaFatura/components/TabelaDeCompras';
import * as apoioDeTeste from './apoioDeTeste';
import * as sessao from '../../../app/sessao';

export const usos = [button, erros, layout, emprestimosPage, devolucoesPage, tabelaDeCompras, apoioDeTeste, sessao];
