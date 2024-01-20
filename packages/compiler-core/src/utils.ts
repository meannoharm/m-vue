import { NodeTypes, Token } from './ast';

export function isText(node: Token) {
  return node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION;
}
