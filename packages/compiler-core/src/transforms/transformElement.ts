import { NodeTypes, Token, createVNodeCall } from '../ast';
import { TransformContext } from '../transform';

export function transformElement(node: Token, context: TransformContext) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      const vnodeTag = `"${node.tag}"`;
      // TODO 支持 props 和 children
      const vnodeProps = null;
      let vnodeChildren = null;
      if (node.children.length) {
        if (node.children.length === 1) {
          vnodeChildren = node.children[0];
        }
      }

      node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
    };
  }
}
