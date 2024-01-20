import { NodeTypes, Token } from '../ast';

export function transformExpression(node: Token) {
  if (node.type === NodeTypes.INTERPOLATION) {
    node.content = processExpression(node.content as Token);
  }
}

function processExpression(node: Token) {
  node.content = `_ctx.${node.content}`;
  return node;
}
