import { Injectable } from '@nestjs/common';
import type { RegistrarTransferencia } from '@cdd/contracts';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import { RepositorioDeConta } from '../../domain/conta/conta.repo.js';
import { RepositorioDeFundo } from '../../domain/fundo/fundo.repo.js';
import { RepositorioDeUnidade } from '../../domain/unidade/unidade.repo.js';
import { validarTransferencia } from '../../domain/transferencia/validar-transferencia.js';

@Injectable()
export class ResolverDadosDaTransferencia {
  constructor(private readonly unidades: RepositorioDeUnidade, private readonly contas: RepositorioDeConta, private readonly fundos: RepositorioDeFundo) {}

  async executar(dados: RegistrarTransferencia): Promise<Result<void, ErroDeDominio>> {
    const valido = validarTransferencia(dados);
    if (valido.tipo === 'erro') return valido;
    const unidades = await Promise.all([dados.unidadeId, dados.unidadeDestinoId].filter(id => id !== null).map(id => this.unidades.porId(id)));
    if (unidades.some(u => u === undefined)) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
    if (unidades.some(u => !u!.ativa)) return err(erroDeDominio('CADASTRO_INATIVO'));
    const contas = await Promise.all([dados.contaOrigemId, dados.contaDestinoId].filter(id => id !== null).map(id => this.contas.porId(id)));
    if (contas.some(c => c === undefined)) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
    if (contas.some(c => !c!.ativa)) return err(erroDeDominio('CADASTRO_INATIVO'));
    if (dados.fundoId !== null) {
      const fundo = await this.fundos.porId(dados.fundoId);
      if (fundo === undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
      if (!fundo.ativo) return err(erroDeDominio('CADASTRO_INATIVO'));
      if (fundo.contaVinculadaId !== dados.contaDestinoId) return err(erroDeDominio('CORPO_INVALIDO', { regra: 'destino_deve_ser_conta_do_fundo' }));
    }
    return ok();
  }
}
