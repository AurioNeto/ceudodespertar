import { BaseSequencer } from 'vitest/node';
import type { TestSpecification } from 'vitest/node';

export default class SequenciadorAlfabetico extends BaseSequencer {
  override sort(arquivos: TestSpecification[]): Promise<TestSpecification[]> {
    return Promise.resolve(arquivos.toSorted((a, b) => a.moduleId.localeCompare(b.moduleId)));
  }
}
