import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { erroDeDominio, ErroDeDominioException } from '../../kernel/erro-de-dominio.js';
import { ArmazenamentoDeArquivos } from './armazenamento-de-arquivos.js';

@Injectable()
export class ArmazenamentoS3 extends ArmazenamentoDeArquivos implements OnModuleDestroy {
  private readonly logger = new Logger(ArmazenamentoS3.name);
  private readonly cliente: S3Client;
  private readonly bucket = process.env['S3_BUCKET'];

  constructor() {
    super();
    const accessKeyId = process.env['S3_CHAVE_DE_ACESSO'];
    const secretAccessKey = process.env['S3_SEGREDO'];
    this.cliente = new S3Client({
      endpoint: process.env['S3_ENDPOINT'],
      region: process.env['S3_REGIAO'],
      forcePathStyle: process.env['S3_ESTILO_DE_CAMINHO'] === 'true',
      credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      maxAttempts: 1,
    });
  }

  gravar(chave: string, conteudo: Buffer, mime: string): Promise<void> {
    return this.executar('gravar', async Bucket => {
      await this.cliente.send(new PutObjectCommand({
        Bucket, Key: chave, Body: conteudo, ContentType: mime,
        ContentDisposition: 'attachment', CacheControl: 'private, no-store',
      }), { abortSignal: AbortSignal.timeout(10_000) });
    });
  }

  urlDeLeitura(chave: string): Promise<string> {
    return this.executar('assinar leitura', Bucket => getSignedUrl(this.cliente,
      new GetObjectCommand({ Bucket, Key: chave }), { expiresIn: 300 }));
  }

  onModuleDestroy(): void { this.cliente.destroy(); }

  private async executar<T>(operacao: string, fn: (bucket: string) => Promise<T>): Promise<T> {
    try {
      if (!this.bucket) throw new Error('S3_BUCKET ausente');
      return await fn(this.bucket);
    } catch {
      this.logger.warn(`Falha ao ${operacao} no armazenamento de arquivos`);
      throw new ErroDeDominioException(erroDeDominio('SERVICO_INDISPONIVEL'));
    }
  }
}
