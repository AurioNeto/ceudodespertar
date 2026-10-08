import { MigracaoB0000Esquemas } from './b0-000-esquemas/migracao.js';
import { MigracaoB0001Shared } from './b0-001-shared/migracao.js';
import { MigracaoB0002Identidade } from './b0-002-identidade/migracao.js';
import { MigracaoB0003CatalogoDePermissoes } from './b0-003-catalogo-de-permissoes/migracao.js';
import { MigracaoB0004Idempotencia } from './b0-004-idempotencia/migracao.js';
import { MigracaoB0005OutboxPorAgregado } from './b0-005-outbox-por-agregado/migracao.js';
import { MigracaoB0006OutboxEsgotados } from './b0-006-outbox-esgotados/migracao.js';
import { MigracaoB0007IdempotenciaExpurgo } from './b0-007-idempotencia-expurgo/migracao.js';
import { MigracaoB0008AuditoriaGrupoEditado } from './b0-008-auditoria-grupo-editado/migracao.js';

export const MIGRACOES_DO_CDD = [
  { name: 'b0-000-esquemas', class: MigracaoB0000Esquemas },
  { name: 'b0-001-shared', class: MigracaoB0001Shared },
  { name: 'b0-002-identidade', class: MigracaoB0002Identidade },
  { name: 'b0-003-catalogo-de-permissoes', class: MigracaoB0003CatalogoDePermissoes },
  { name: 'b0-004-idempotencia', class: MigracaoB0004Idempotencia },
  { name: 'b0-005-outbox-por-agregado', class: MigracaoB0005OutboxPorAgregado },
  { name: 'b0-006-outbox-esgotados', class: MigracaoB0006OutboxEsgotados },
  { name: 'b0-007-idempotencia-expurgo', class: MigracaoB0007IdempotenciaExpurgo },
  { name: 'b0-008-auditoria-grupo-editado', class: MigracaoB0008AuditoriaGrupoEditado },
];
