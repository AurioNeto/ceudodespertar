import { Injectable } from '@nestjs/common';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { RegistradorDeUltimoAcesso } from '../../application/registrador-de-ultimo-acesso.js';
import type { PedidoDeRegistroDeAcesso } from '../../application/registrador-de-ultimo-acesso.js';
import { emContextoDaInstituicao } from '../../../../shared/infrastructure/contexto-da-instituicao.js';

@Injectable()
export class RegistradorDeUltimoAcessoKysely extends RegistradorDeUltimoAcesso {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {
    super();
  }

  async registrar(pedido: PedidoDeRegistroDeAcesso): Promise<void> {
    await emContextoDaInstituicao(pedido.instituicaoId, () =>
      this.unidadeDeTrabalho.transacao('escrita', ({ kysely }) =>
        kysely
          .updateTable('identidade.usuario')
          .set({ ultimo_acesso_em: pedido.em })
          .where('id', '=', pedido.usuarioId)
          .where((condicao) =>
            condicao.or([
              condicao('ultimo_acesso_em', 'is', null),
              condicao('ultimo_acesso_em', '<', pedido.seUltimoAcessoAnteriorA),
            ]),
          )
          .execute(),
      ),
    );
  }
}
