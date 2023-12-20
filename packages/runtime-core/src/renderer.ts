import { isString, ShapeFlags } from "@vue/shared";
import { createVnode, isSameVnode, Text } from "./vnode";

export function createRenderer(renderOptions) {
  let {
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
    setText: hostSetText,
    querySelector: hostQuerySelector,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    createElement: hostCreateElement,
    createText: hostCreateText,
    patchProp: hostPatchProp,
  } = renderOptions;

  const normalize = (child) => {
    if (isString(child)) {
      return createVnode(Text, null, child);
    }
    return child;
  };

  const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
      let child = normalize(children[i]);
      patch(null, child, container);
    }
  };

  const mountElement = (vnode, container) => {
    let { type, props, children, shapeFlag } = vnode;
    // 真实元素挂载到虚拟节点
    let el = (vnode.el = hostCreateElement(type));
    if (props) {
      for (let key in props) {
        hostPatchProp(el, key, props[key]);
      }
    }
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 文本节点
      hostSetElementText(el, children);
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el);
    }
    hostInsert(el, container);
  };

  const processText = (n1, n2, container) => {
    if (n1 === null) {
      hostInsert((n2.el = hostCreateText(n2.children)), container);
    } else {
      // 文本变化，节点不变
      const el = n2.el = n1.el;
      if (n1.children !== n2.children) {
        // 更新文本
        hostSetText(el, n2.children);
      }
    }
  };

  const patchProps = (oldProps, newProps, container) => {
    
  }

  const patchElement = (n1, n2, container) => {
    // 先复用节点
    // 再比较属性
    // 再比较儿子
    let el = n2.el = n1.el;

    let oldProps = n1.props || {};
    let newProps = n2.props || {};

    patchProps(oldProps, newProps, container)
  }

  const processElement = (n1, n2, container) => {
    if (n1 === null) {
      mountElement(n2, container);
    } else {
      // 元素更新
      patchElement(n1, n2, container)
    }
  };

  const patch = (n1, n2, container) => {
    if (n1 === n2) return;

    // 判断两个元素是否相同，不相同则卸载老的再添加新的
    if (n1 && !isSameVnode(n1, n2) ) {
      unmount(n1); // 删除老的
      n1 = null;
    }

    const { type, shapeFlag } = n2;

    switch (type) {
      case Text:
        processText(n1, n2, container);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container);
        }
    }
  };

  const unmount = (vnode) => {
    hostRemove(vnode.el);
  };

  const render = (vnode, container) => {
    if (vnode == null) {
      // 当前vnode是空，卸载
      if (container._vnode) {
        unmount(container._vnode);
      }
    } else {
      // 挂载，初始化和更新
      patch(null, vnode, container);
    }
    container._vnode = vnode;
  };
  return {
    render,
  };
}
