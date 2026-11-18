import { basename } from 'node:path';
import { erroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok } from '../../../../shared/kernel/result.js';

export const LIMITE_DO_COMPROVANTE = 10 * 1024 * 1024;

export interface ArquivoRecebido {
  readonly buffer: Buffer;
  readonly originalname: string;
  readonly mimetype: string;
}

const assinaturas = new Map([
  ['application/pdf', Buffer.from('%PDF-')],
  ['image/jpeg', Buffer.from([0xff, 0xd8, 0xff])],
  ['image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
]);

export function validarArquivo(arquivo: ArquivoRecebido | undefined) {
  if (!arquivo || arquivo.buffer.length === 0) return err(erroDeDominio('CORPO_INVALIDO'));
  if (arquivo.buffer.length > LIMITE_DO_COMPROVANTE) return err(erroDeDominio('CORPO_GRANDE_DEMAIS'));
  const assinatura = assinaturas.get(arquivo.mimetype);
  const nome = basename(arquivo.originalname.replaceAll('\\', '/')).trim();
  if (!assinatura || !arquivo.buffer.subarray(0, assinatura.length).equals(assinatura)
    || nome.length === 0 || nome.length > 255 || /\p{Cc}/u.test(nome)) {
    return err(erroDeDominio('CORPO_INVALIDO'));
  }
  return ok({ nome, mime: arquivo.mimetype, conteudo: arquivo.buffer });
}
