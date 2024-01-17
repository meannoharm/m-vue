import { NodeTypes, ElementTypes } from '../src/ast';
import { baseParse } from '../src/parse';

describe('parse', () => {
  describe('text', () => {
    test('simple text', () => {
      const ast = baseParse('some text');
      const text = ast.children[0];
      expect(text).toStrictEqual({
        type: NodeTypes.TEXT,
        content: 'some text',
      });
    });

    test('simple text with invalid end tag', () => {
      const ast = baseParse('some text</div>');
      const text = ast.children[0];
      expect(text).toStrictEqual({
        type: NodeTypes.TEXT,
        content: 'some text',
      });
    });

    test('text with interpolation', () => {
      const ast = baseParse('some {{ foo + bar }} text');
      const text1 = ast.children[0];
      const text2 = ast.children[2];
      expect(text1).toStrictEqual({
        type: NodeTypes.TEXT,
        content: 'some ',
      });
      expect(text2).toStrictEqual({
        type: NodeTypes.TEXT,
        content: ' text',
      });
    });
  });

  describe('interpolation', () => {
    test('simple interpolation', () => {
      const ast = baseParse('{{message}}');
      const text = ast.children[0];
      expect(text).toStrictEqual({
        type: NodeTypes.INTERPOLATION,
        content: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: 'message',
        },
      });
    });
  });

  describe('element', () => {
    test('simple div', () => {
      const ast = baseParse('<div>hello</div>');
      const div = ast.children[0];
      expect(div).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        tagType: ElementTypes.ELEMENT,
        children: [
          {
            type: NodeTypes.TEXT,
            content: 'hello',
          },
        ],
      });
    });

    test('element with interpolation', () => {
      const ast = baseParse('<div>{{ msg }}</div>');
      const element = ast.children[0];

      expect(element).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        tagType: ElementTypes.ELEMENT,
        children: [
          {
            type: NodeTypes.INTERPOLATION,
            content: {
              type: NodeTypes.SIMPLE_EXPRESSION,
              content: 'msg',
            },
          },
        ],
      });
    });

    test('element with interpolation and text', () => {
      const ast = baseParse('<div>{{ foo }} bar</div>');
      const element = ast.children[0];

      expect(element).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        tagType: ElementTypes.ELEMENT,
        children: [
          {
            type: NodeTypes.INTERPOLATION,
            content: {
              type: NodeTypes.SIMPLE_EXPRESSION,
              content: 'foo',
            },
          },
          {
            type: NodeTypes.TEXT,
            content: ' bar',
          },
        ],
      });
    });

    test('should throw error when lack end tag', () => {
      expect(() => {
        baseParse('<div><span></div>');
      }).toThrow();
    });
  });
});
