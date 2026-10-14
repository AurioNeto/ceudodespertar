import { useRef, useState } from 'react';

export function useDraftForm(onAnswer: (answer: string) => void) {
  const [rascunho, setRascunho] = useState('');
  const formulario = useRef<HTMLDivElement>(null);
  const resposta = rascunho.trim();

  function entregar() {
    onAnswer(resposta);
    setRascunho('');
    formulario.current?.querySelector('textarea')?.focus();
  }

  return { rascunho, setRascunho, formulario, resposta, entregar };
}
