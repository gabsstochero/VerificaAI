/**
 * Cria elementos DOM de forma segura: o conteúdo vai sempre como texto
 * (nunca innerHTML), então nada vindo da IA ou do usuário vira HTML.
 */
export function el(tag, { className, text, attrs = {} } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  for (const child of [].concat(children)) if (child) node.append(child);
  return node;
}
