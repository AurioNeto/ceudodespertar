export function criarRegistroDeFalhas() {
  const mensagens = new Set();
  return {
    registrar(mensagem) {
      mensagens.add(mensagem);
    },
    conferir() {
      if (mensagens.size === 0) return;
      const todas = [...mensagens];
      mensagens.clear();
      throw new Error(todas.join('; '));
    },
  };
}
