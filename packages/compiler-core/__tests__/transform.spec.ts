import { baseParse } from '../src/parse';
import { transform } from '../src/transform';
import { TO_DISPLAY_STRING } from '../src/runtimeHelpers';

describe('transform', () => {
  test('context state', () => {
    const ast = baseParse('<div>hello {{ world }}</div>');

    const calls: any[] = [];
    const plugin = (node, context) => {
      calls.push([node, { ...context }]);
    };

    transform(ast, {
      nodeTransforms: [plugin],
    });

    const div = ast.children[0];
    expect(calls.length).toBe(4);
    console.log(calls);
    expect(calls[0]).toMatchObject([ast, {}]);
    expect(calls[1]).toMatchObject([div, {}]);
    expect(calls[2]).toMatchObject([div.children[0], {}]);
    expect(calls[3]).toMatchObject([div.children[1], {}]);
  });

  test('should inject toString helper for interpolations', () => {
    const ast = baseParse('{{ foo }}');
    transform(ast, {});
    expect(ast.helpers).toContain(TO_DISPLAY_STRING);
  });
});
