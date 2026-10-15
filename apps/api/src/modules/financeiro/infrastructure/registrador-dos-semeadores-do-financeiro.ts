import { Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { SemeadoresDaInstituicao } from '../../../shared/infrastructure/semeadura/semeadores-da-instituicao.js';
import { SemeadorDeCadastrosDaCasa } from './persistencia/semeador-de-cadastros-da-casa.js';

@Injectable()
export class RegistradorDosSemeadoresDoFinanceiro implements OnModuleInit {
  constructor(
    private readonly semeadores: SemeadoresDaInstituicao,
    private readonly cadastrosDaCasa: SemeadorDeCadastrosDaCasa,
  ) {}

  onModuleInit(): void {
    this.semeadores.registrar(this.cadastrosDaCasa);
  }
}
