import { isString, ShapeFlags, isArray } from "@m-vue/shared";

export const Text = Symbol("Text");

export function isVnode(value) {
  return !!(value && value.__v_isVnode);
}

export function isSameVnode(n1, n2) {
  // 1. 标签名相同
  // 2. key相同
  return n1.type === n2.type && n1.key === n2.key;
}

export function createVnode(type, props, children = null) {
  // 组合方案 shapeFlag
  let shapeFlag = isString(type) ? ShapeFlags.ELEMENT : 0;

  const vnode = {
    type,
    props,
    children,
    el: null, // 对应的真实节点
    key: props?.["key"],
    __v_isVnode: true,
    shapeFlag,
  };

  if (children) {
    let type = 0;
    if (isArray(children)) {
      type = ShapeFlags.ARRAY_CHILDREN;
    } else {
      children = String(children);
      type = ShapeFlags.TEXT_CHILDREN;
    }
    vnode.shapeFlag |= type;
  }
  return vnode;
}
