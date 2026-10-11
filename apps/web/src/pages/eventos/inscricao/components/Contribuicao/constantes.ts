export const CONTRIBUICAO_POR_QUEM_INSCREVE = {
  casa: {
    titulo: 'Contribuição sugerida',
    recado: {
      inicio: 'Três níveis definidos pelos padrinhos, referentes só à participação na cerimônia. ',
      destaque: 'São sugestão, não preço',
      fim: ': o valor se conversa para menos conforme a condição de cada um, e quem quiser contribuir mais pode.',
    },
    larguraDoRecado: '76ch',
    rotuloDoValor: 'Valor combinado',
    dicaDoValor: 'Sempre editável. Escolher um nível preenche este campo; o que vale é o que está aqui.',
    tecladoDoValor: undefined,
    abaixoDoSocial:
      'Abaixo do nível social — combinado com a pessoa. Não precisa de justificativa: a casa não cobra explicação de quem contribui com o que pode.',
    acimaDoProspero: 'Acima do próspero — contribuição voluntária além do sugerido.',
    mostraNivelEscolhido: true,
  },
  pessoa: {
    titulo: 'Contribuição',
    recado: {
      inicio: 'Três valores sugeridos pelos padrinhos, referentes à participação na cerimônia. ',
      destaque: 'São sugestão, não preço.',
      fim: ' Escolha o que couber na sua condição — e, se puder e quiser contribuir mais, também pode.',
    },
    larguraDoRecado: '60ch',
    rotuloDoValor: 'Quanto você vai contribuir',
    dicaDoValor: 'Pode digitar outro valor. Ninguém vai te cobrar explicação.',
    tecladoDoValor: 'decimal',
    abaixoDoSocial: 'Abaixo do valor social, e tudo bem. Se quiser conversar sobre isso, a recepção está no WhatsApp.',
    acimaDoProspero: 'Obrigado — isso é contribuição voluntária acima do sugerido.',
    mostraNivelEscolhido: false,
  },
} as const;
