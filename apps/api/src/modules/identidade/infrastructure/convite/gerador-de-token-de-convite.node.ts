import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { GeradorDeTokenDeConvite } from '../../application/convite/gerador-de-token-de-convite.js';
import type { TokenDeConvite } from '../../application/convite/gerador-de-token-de-convite.js';

const BYTES_DO_TOKEN = 32;

@Injectable()
export class GeradorDeTokenDeConviteNode extends GeradorDeTokenDeConvite {
  gerar(): TokenDeConvite {
    const token = randomBytes(BYTES_DO_TOKEN).toString('base64url');
    return { token, hash: this.hashDe(token) };
  }

  hashDe(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
