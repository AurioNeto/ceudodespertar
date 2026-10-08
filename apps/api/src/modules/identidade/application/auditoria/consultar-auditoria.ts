import { Injectable } from '@nestjs/common';
import type { DetalheDeAuditoria, FiltroDeAuditoria, PaginaDeAuditoria, RegistroDeAuditoria } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import { erroDeDominio, ErroDeDominioException } from '../../../../shared/kernel/erro-de-dominio.js';
import type { AcessoDoUsuario } from '../obter-eu.js';
import { codificarCursor, decodificarCursor, ErroDeCursorInvalido } from './cursor-de-auditoria.js';
import type { PosicaoDaTrilha } from './cursor-de-auditoria.js';
import type { EntradaDeAuditoria } from './entrada-de-auditoria.js';
import { LeitorDeAuditoria } from './leitor-de-auditoria.js';
import { ROTULOS_DE_AUDITORIA } from './rotulos-de-auditoria.js';
import { TrilhaDeAuditoria } from './trilha-de-auditoria.js';

const AGREGADO_DA_TRILHA = 'Auditoria';

function detalhesDoFiltro(filtro: FiltroDeAuditoria): DetalheDeAuditoria[] {
  return [
    ...(filtro.de === undefined ? [] : [{ rotulo: ROTULOS_DE_AUDITORIA.periodoInicial, valor: filtro.de }]),
    ...(filtro.ate === undefined ? [] : [{ rotulo: ROTULOS_DE_AUDITORIA.periodoFinal, valor: filtro.ate }]),
    ...(filtro.operacao === undefined ? [] : [{ rotulo: ROTULOS_DE_AUDITORIA.operacao, valor: filtro.operacao }]),
  ];
}

function posicaoDoCursor(cursor: string | undefined): PosicaoDaTrilha | null {
  if (cursor === undefined) return null;
  try {
    return decodificarCursor(cursor);
  } catch (erro) {
    if (!(erro instanceof ErroDeCursorInvalido)) throw erro;
    throw new ErroDeDominioException(
      erroDeDominio('CORPO_INVALIDO', { problemas: [{ caminho: 'depois', mensagem: erro.message }], total: 1 }),
    );
  }
}

function paginar(registros: readonly RegistroDeAuditoria[], limite: number): PaginaDeAuditoria {
  const itens = registros.slice(0, limite);
  const ultimo = itens.at(-1);
  const haMais = registros.length > limite && ultimo !== undefined;
  return {
    itens,
    proxima: haMais ? codificarCursor({ em: new Date(ultimo.em), id: ultimo.id }) : null,
  };
}

@Injectable()
export class ConsultarAuditoria {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly trilha: TrilhaDeAuditoria,
    private readonly leitor: LeitorDeAuditoria,
    private readonly relogio: Relogio,
  ) {}

  async executar(acesso: AcessoDoUsuario, filtro: FiltroDeAuditoria): Promise<PaginaDeAuditoria> {
    const depois = posicaoDoCursor(filtro.depois);
    return this.unidadeDeTrabalho.transacao('leitura-que-grava', async (contexto) => {
      await this.trilha.gravar(contexto, [this.entradaDaConsulta(acesso, filtro)]);
      const registros = await this.leitor.ler(contexto, {
        ...(filtro.de === undefined ? {} : { de: new Date(filtro.de) }),
        ...(filtro.ate === undefined ? {} : { ate: new Date(filtro.ate) }),
        ...(filtro.operacao === undefined ? {} : { operacao: filtro.operacao }),
        depois,
        limite: filtro.limite + 1,
      });
      return paginar(registros, filtro.limite);
    });
  }

  private entradaDaConsulta(acesso: AcessoDoUsuario, filtro: FiltroDeAuditoria): EntradaDeAuditoria {
    return {
      em: this.relogio.agora(),
      autorId: acesso.usuarioId,
      operacao: 'AUDITORIA_CONSULTADA',
      agregadoTipo: AGREGADO_DA_TRILHA,
      agregadoId: acesso.instituicaoId,
      pessoaAlvoId: null,
      detalhes: detalhesDoFiltro(filtro),
      sensivel: true,
    };
  }
}
