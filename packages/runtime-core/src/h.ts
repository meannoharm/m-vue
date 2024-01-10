import { isObject } from './../../shared/src/index';
import { isArray } from '@m-vue/shared';
import { createVnode, isVnode } from './vnode';

// 返回后children只可能是数组或者文本
export function h(type, propsChildren?, children?) {
  const l = arguments.length;

  if (l === 2) {
    // h('div', {style: {"color": "red"}})
    // h('div', h('span'))
    // h('div', [h('span'), h('span')])
    // h('div', 'hello')
    if (isObject(propsChildren) && !isArray(propsChildren)) {
      if (isVnode(propsChildren)) {
        // 虚拟节点包装成数组
        return createVnode(type, null, [propsChildren]);
      }
      // 属性
      return createVnode(type, propsChildren);
    } else {
      // 数组
      return createVnode(type, null, propsChildren);
    }
  } else {
    // 参数大于三个，第二个参数为属性
    if (l > 3) {
      children = Array.from(arguments).slice(2);
    } else if (l === 3 && isVnode(children)) {
      // h('div', {}, h('span'))
      children = [children];
    }

    return createVnode(type, propsChildren, children);
  }
}
