import { NodeTypes, Token } from './ast';
import { TO_DISPLAY_STRING } from './runtimeHelpers';

type NodeTransform = (node: Token, context: TransformContext) => void | (() => any) | (() => any)[];

export interface TransformOptions {
  nodeTransforms?: NodeTransform[];
}

export function transform(root: Token, options: TransformOptions = {}) {
  const context = createTransformContext(root, options);
  traverseNode(root, context);
  createRootCodegen(root, context);
  root.helpers.push(...Array.from(context.helpers.keys()));
}

export interface TransformContext {
  root: Token;
  nodeTransforms: NodeTransform[];
  helpers: Map<string | Symbol, number>;
  helper(name: string | Symbol): string | Symbol;
}

function createTransformContext(root: Token, options: TransformOptions): TransformContext {
  return {
    root,
    nodeTransforms: options.nodeTransforms || [],
    helpers: new Map(),
    // 收集调用次数
    helper(name: string | Symbol) {
      const count = this.helpers.get(name) || 0;
      this.helpers.set(name, count + 1);
      return name;
    },
  };
}

function traverseNode(node: Token, context: TransformContext) {
  const type: NodeTypes = node.type;
  const nodeTransforms = context.nodeTransforms;
  const exitFns = [];

  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i];
    const onExit = transform(node, context);
    if (onExit) {
      if (Array.isArray(onExit)) {
        exitFns.push(...onExit);
      } else {
        exitFns.push(onExit);
      }
    }
  }

  switch (type) {
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING);
      break;
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      traverseChildren(node, context);
      break;
  }

  // 可能比for循环更快
  let i = exitFns.length;
  while (i--) {
    exitFns[i]();
  }
}

function traverseChildren(node: Token, context: TransformContext) {
  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    traverseNode(children[i], context);
  }
}

function createRootCodegen(root: Token, context: TransformContext) {
  const { children } = root;
  if (children.length === 1) {
    const child = children[0];
    if (child.type === NodeTypes.ELEMENT && child.codegenNode) {
      const codegenNode = child.codegenNode;
      root.codegenNode = codegenNode;
    } else {
      root.codegenNode = child;
    }
  }
}
