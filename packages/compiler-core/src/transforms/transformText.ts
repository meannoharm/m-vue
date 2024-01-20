import { NodeTypes, Token } from '../ast';
import { TransformContext } from '../transform';
import { isText } from '../utils';

export function transformText(node: Token, context: TransformContext) {
  if (node.type === NodeTypes.TEXT) {
    return () => {
      const children = node.children;
      let currentContainer;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        if (isText(child)) {
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j];
            if (isText(next)) {
              if (!currentContainer) {
                currentContainer = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION,
                  loc: child.loc,
                  children: [child],
                };
              }
              currentContainer.children.push(' + ', next);
              children.splice(j, 1);
              j--;
            } else {
              currentContainer = undefined;
              break;
            }
          }
        }
      }
    };
  }
}
