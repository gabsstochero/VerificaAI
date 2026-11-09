import test from 'node:test';
import assert from 'node:assert/strict';
import { extractJson, extractSources, normalizeResult, parseModelOutput } from '../src/normalize.js';

test('extractJson tolera cercas de markdown e texto extra', () => {
  const out = extractJson('Claro!\n```json\n{"a": 1}\n```\nEspero ter ajudado.');
  assert.deepEqual(out, { a: 1 });
});

test('parseModelOutput lê o JSON devolvido pelo Gemini', () => {
  const text = '{"classificacao":"possivelmente_falsa","confianca":80,"explicacao":"Texto.","pontos_para_verificar":["A"]}';
  assert.equal(parseModelOutput(text).confianca, 80);
});

test('parseModelOutput falha com texto sem JSON', () => {
  assert.throws(() => parseModelOutput('desculpe, não consegui analisar'));
});

test('normalizeResult aceita variações de classificação e confiança', () => {
  const r = normalizeResult({
    classificacao: 'Possivelmente Falsa',
    confianca: '82%',
    explicacao: ' Explicação. ',
    pontos_para_verificar: ['Ponto 1', '', 42],
  });
  assert.equal(r.classification, 'possivelmente_falsa');
  assert.equal(r.label, 'Possivelmente falsa');
  assert.equal(r.confidence, 82);
  assert.equal(r.explanation, 'Explicação.');
  assert.deepEqual(r.checkPoints, ['Ponto 1']);
});

test('normalizeResult converte fração em porcentagem e limita o intervalo', () => {
  assert.equal(normalizeResult({ classificacao: 'x', confianca: 0.7, explicacao: 'ok' }).confidence, 70);
  assert.equal(normalizeResult({ classificacao: 'x', confianca: 300, explicacao: 'ok' }).confidence, 100);
});

test('classificação desconhecida vira "não foi possível verificar"', () => {
  const r = normalizeResult({ classificacao: '100% falsa!!!', confianca: 90, explicacao: 'ok' });
  assert.equal(r.classification, 'nao_foi_possivel_verificar');
});

test('sem pontos de verificação, usa os pontos padrão', () => {
  const r = normalizeResult({ classificacao: 'possivelmente_verdadeira', explicacao: 'ok' });
  assert.equal(r.checkPoints.length, 4);
});

test('sem explicação, falha', () => {
  assert.throws(() => normalizeResult({ classificacao: 'possivelmente_falsa' }));
});

test('extractSources lê groundingChunks, remove duplicadas e ignora URLs não http(s)', () => {
  const chunks = [
    { web: { uri: 'https://www.aosfatos.org/exemplo', title: 'Aos Fatos: exemplo' } },
    { web: { uri: 'https://www.gov.br/saude/exemplo', title: 'Ministério da Saúde' } },
    { web: { uri: 'https://www.aosfatos.org/exemplo', title: 'Duplicada' } },
    { web: { uri: 'javascript:alert(1)', title: 'Ruim' } },
  ];
  const s = extractSources(chunks);
  assert.deepEqual(s.map((x) => x.url), ['https://www.aosfatos.org/exemplo', 'https://www.gov.br/saude/exemplo']);
});

test('extractSources lê a partir do objeto de resposta do SDK do Gemini', () => {
  const response = {
    candidates: [
      { groundingMetadata: { groundingChunks: [{ web: { uri: 'https://example.com/x', title: 'Exemplo' } }] } },
    ],
  };
  assert.deepEqual(extractSources(response), [{ title: 'Exemplo', url: 'https://example.com/x' }]);
});

test('extractSources sem groundingMetadata devolve lista vazia', () => {
  assert.deepEqual(extractSources({ candidates: [{}] }), []);
});
