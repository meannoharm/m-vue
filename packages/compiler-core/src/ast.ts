import { CREATE_ELEMENT_VNODE } from './runtimeHelpers';

export enum NodeTypes {
  ROOT,
  TEXT,
  ELEMENT,
  INTERPOLATION,
  SIMPLE_EXPRESSION,
  COMPOUND_EXPRESSION,
}

export enum ElementTypes {
  ELEMENT,
}

export interface Token {
  type: NodeTypes;
  children?: Token[];
  tag?: string;
  tagType?: ElementTypes;
  content?: Token | string;
  helpers?: any[];
  codegenNode?: any;
  loc?: any;
}

export function createSimpleExpression(content) {
  return {
    type: NodeTypes.SIMPLE_EXPRESSION,
    content,
  };
}

export function createInterpolation(content) {
  return {
    type: NodeTypes.INTERPOLATION,
    content: content,
  };
}

export function createVNodeCall(context, tag, props?, children?) {
  if (context) {
    context.helper(CREATE_ELEMENT_VNODE);
  }

  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    children,
  };
}
