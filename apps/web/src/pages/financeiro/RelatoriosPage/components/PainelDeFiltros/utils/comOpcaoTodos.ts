export const comOpcaoTodos = (todos: [string, string], lista: readonly string[]) => [
  { value: todos[0], label: todos[1] },
  ...lista.map((v) => ({ value: v, label: v })),
];
