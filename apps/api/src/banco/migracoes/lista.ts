import { MigracaoB0000Esquemas } from './b0-000-esquemas/migracao.js';
import { MigracaoB0001Shared } from './b0-001-shared/migracao.js';
import { MigracaoB0002Identidade } from './b0-002-identidade/migracao.js';
import { MigracaoB0003CatalogoDePermissoes } from './b0-003-catalogo-de-permissoes/migracao.js';
import { MigracaoB0005OutboxPorAgregado } from './b0-005-outbox-por-agregado/migracao.js';

export const MIGRACOES_DO_CDD = [
  { name: 'b0-000-esquemas', class: MigracaoB0000Esquemas },
  { name: 'b0-001-shared', class: MigracaoB0001Shared },
  { name: 'b0-002-identidade', class: MigracaoB0002Identidade },
  { name: 'b0-003-catalogo-de-permissoes', class: MigracaoB0003CatalogoDePermissoes },
  { name: 'b0-005-outbox-por-agregado', class: MigracaoB0005OutboxPorAgregado },
];
