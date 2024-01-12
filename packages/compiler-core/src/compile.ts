import { baseParse } from './parse';
import { transform } from './transform';
import { generate } from './codegen';
import { transformElement } from './transforms/transformElement';
import { transformText } from './transforms/transformText';
import { transformExpression } from './transforms/transformExpression';

export function baseCompile(template, options) {
  // 模板 -> parse(str) -> 模板AST
  const ast = baseParse(template);
  // 模板AST -> transform(ast) -> javascript AST
  transform(
    ast,
    Object.assign(options, {
      nodeTransforms: [transformElement, transformText, transformExpression],
    }),
  );
  // javascript AST -> generate(ast) -> code/渲染函数
  return generate(ast);
}
