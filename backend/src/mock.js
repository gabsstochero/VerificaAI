/**
 * Modo demonstração (MOCK_MODE=true): não chama nenhuma API.
 * Serve apenas para testar a interface sem chave e sem custo.
 * A "análise" abaixo é uma simulação por palavras-chave, NÃO é IA.
 */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mockAnalysis(text) {
  await wait(1200);
  const note = '[Modo demonstração: resposta simulada, sem IA.] ';

  if (/compartilh|urgente|milagr|\bcura\b|antes que apaguem/i.test(text)) {
    return {
      classification: 'possivelmente_falsa',
      label: 'Possivelmente falsa',
      confidence: 82,
      explanation:
        note +
        'O conteúdo apresenta afirmações sem evidências no texto e usa linguagem que pode indicar tentativa de causar urgência ou sensacionalismo.',
      checkPoints: [
        'Verificar a fonte original da informação.',
        'Procurar a mesma informação em veículos jornalísticos confiáveis.',
        'Conferir a data da publicação.',
        'Verificar se existem fontes oficiais sobre o assunto.',
      ],
      sources: [],
    };
  }

  if (/bissexto|ibge|banco central|minist[eé]rio/i.test(text)) {
    return {
      classification: 'possivelmente_verdadeira',
      label: 'Possivelmente verdadeira',
      confidence: 71,
      explanation:
        note + 'O texto descreve um fato plausível e cita instituições conhecidas, sem sinais de sensacionalismo.',
      checkPoints: [
        'Conferir o dado no site da instituição citada.',
        'Verificar a data em que a informação foi divulgada.',
        'Comparar com o que outros veículos de imprensa publicaram.',
      ],
      sources: [{ title: 'Exemplo de fonte (simulada)', url: 'https://example.com/' }],
    };
  }

  return {
    classification: 'nao_foi_possivel_verificar',
    label: 'Não foi possível verificar',
    confidence: 40,
    explanation:
      note + 'O texto não traz informações suficientes para conferir as afirmações, como fontes, datas ou nomes.',
    checkPoints: [
      'Procurar quem originalmente publicou essa informação.',
      'Buscar confirmação em fontes oficiais ou na imprensa.',
      'Desconfiar até que haja confirmação de mais de uma fonte.',
    ],
    sources: [],
  };
}
