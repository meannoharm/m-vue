import { ElementTypes, NodeTypes, Token } from './ast';

const enum TagType {
  Start,
  End,
}

export interface ParserContext {
  source: string;
}

export function baseParse(content: string) {
  const context = createParserContext(content);
  return createRoot(parseChildren(context, []));
}

export function createRoot(children: Token[]): Token {
  return {
    type: NodeTypes.ROOT,
    children,
    helpers: [],
  };
}

function createParserContext(content: string): ParserContext {
  return {
    source: content,
  };
}

function parseChildren(context: ParserContext, ancestors) {
  const nodes: Token[] = [];

  while (!isEnd(context, ancestors)) {
    let node;
    const s = context.source;
    if (startsWith(s, '{{')) {
      // 表示插值
      node = parseInterpolation(context);
    } else if (s[0] === '<') {
      // 表示是一个标签
      if (s[1] === '/') {
        // 结束标签
        if (/[a-z]/i.test(s[2])) {
          parseTag(context, TagType.End);
        }
      } else if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors);
      }
    }

    if (!node) {
      node = parseText(context);
    }

    nodes.push(node);
  }
  return nodes;
}

function isEnd(context: ParserContext, ancestors) {
  const s = context.source;
  if (context.source.startsWith('</')) {
    for (let i = ancestors.length - 1; i >= 0; i--) {
      if (startsWithEndTagOpen(s, ancestors[i].tag)) {
        return true;
      }
    }
  }
  return !context.source;
}

function startsWith(source: string, searchString: string): boolean {
  return source.startsWith(searchString);
}

function parseElement(context, ancestors) {
  const element = parseTag(context, TagType.Start);

  ancestors.push(element);
  const children = parseChildren(context, ancestors);
  ancestors.pop();

  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End);
  } else {
    throw new Error(`Element ${element.tag} is missing end tag.`);
  }

  element.children = children;
  return element;
}

export interface TagToken extends Node {
  type: NodeTypes.ELEMENT;
  tag: string;
  tagType: ElementTypes;
}

function parseTag(context, type: TagType): Token {
  const match: any = /^<\/?([a-z][^\r\n\t\f />]*)/i.exec(context.source);
  const tag = match[1];

  advanceBy(context, match[0].length);

  // TODO 暂时不处理 selfClosing 的情况
  advanceBy(context, 1);

  if (type === TagType.End) return;

  return {
    type: NodeTypes.ELEMENT,
    tag,
    tagType: ElementTypes.ELEMENT,
  };
}

function advanceBy(context: ParserContext, numberOfCharacters: number) {
  console.log('advance');
  context.source = context.source.slice(numberOfCharacters);
}

function startsWithEndTagOpen(source: string, tag: string) {
  return (
    source.startsWith('</' + tag) &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
  );
}

function parseInterpolation(context: ParserContext): Token {
  const openDelimiter = '{{';
  const closeDelimiter = '}}';

  const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length);

  if (closeIndex === -1) {
    throw new Error(`Interpolation is missing closing delimiter '${closeDelimiter}'.`);
  }

  // 去掉 '{{'
  advanceBy(context, openDelimiter.length);

  const rawContentLength = closeIndex - openDelimiter.length;
  const rawContent = context.source.slice(0, rawContentLength);

  const preTrimContent = parseTextData(context, rawContent.length);
  const content = preTrimContent.trim();

  advanceBy(context, closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
    },
  };
}

function parseText(context: ParserContext): Token {
  console.log('parseText');
  const endTokens = ['{{', '<'];
  let endIndex = context.source.length;

  // 找到最近的结束标签
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i], 1);
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }

  const content = parseTextData(context, endIndex);

  return {
    type: NodeTypes.TEXT,
    content,
  };
}

function parseTextData(context: ParserContext, length: number): string {
  const rawText = context.source.slice(0, length);
  advanceBy(context, length);
  return rawText;
}
