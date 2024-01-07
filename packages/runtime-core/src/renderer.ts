import { hasOwn, isNumber, isString, ShapeFlags } from '@m-vue/shared';
import { createVnode, Fragment, isSameVnode, Text } from './vnode';
import { reactive, ReactiveEffect } from '@m-vue/reactivity';
import { queueJob } from './scheduler';
import { initProps, updateProps, hasPropsChanged } from './componentProps';
import { createComponentInstance, setupComponent } from './component';
import { should } from 'vitest';

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
    if (isString(child) || isNumber(child)) {
      return createVnode(Text, null, child);
    }
    return child;
  };

  const mountChildren = (children, el) => {
    for (let i = 0; i < children.length; i++) {
      let child = normalize(children[i]);
      patch(null, child, el);
    }
  };

  const mountElement = (vnode, container, anchor) => {
    let { type, props, children, shapeFlag } = vnode;
    // 真实元素挂载到虚拟节点
    let el = (vnode.el = hostCreateElement(type));
    if (props) {
      for (let key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 文本节点
      hostSetElementText(el, children);
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el);
    }
    hostInsert(el, container, anchor);
  };

  const processText = (n1, n2, container) => {
    if (n1 === null) {
      hostInsert((n2.el = hostCreateText(n2.children)), container);
    } else {
      // 文本变化，节点不变
      const el = (n2.el = n1.el);
      if (n1.children !== n2.children) {
        // 更新文本
        hostSetText(el, n2.children);
      }
    }
  };

  const patchProps = (oldProps, newProps, container) => {
    for (let key in newProps) {
      hostPatchProp(container, key, oldProps[key], newProps[key]);
    }

    for (let key in oldProps) {
      if (!newProps.hasOwnProperty(key)) {
        hostPatchProp(container, key, oldProps[key], undefined);
      }
    }
  };

  const unmountChildren = (children) => {
    for (let i = 0; i < children.length; i++) {
      unmount(children[i]);
    }
  };

  const patchKeyedChildren = (c1, c2, container) => {
    let i = 0;
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;

    // sync from start
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSameVnode(n1, n2)) {
        patch(n1, n2, container);
      } else {
        break;
      }
      i++;
    }

    // sync from end
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSameVnode(n1, n2)) {
        patch(n1, n2, container);
      } else {
        break;
      }
      e1--;
      e2--;
    }

    // common sequence + mount
    // i 比 e1 大，说明老的比新的少，需要挂载新的
    // i 和 e2 之间的就是新增部分
    if (i > e1) {
      if (i <= e2) {
        while (i <= e2) {
          const nextPos = e2 + 1;
          const anchor = nextPos < c2.length ? c2[nextPos].el : null;
          patch(null, c2[i], container, anchor);
          i++;
        }
      }
    }

    // common sequence + unmount
    // i 比 e2 大，说明新的比老的少，需要卸载老的
    // i 和 e1 之间的就是需要卸载的
    else if (i > e2) {
      while (i <= e1) {
        unmount(c1[i]);
        i++;
      }
    }

    // 乱序对比
    let s1 = i;
    let s2 = i;

    const keyToNewIndexMap = new Map();
    for (let i = s2; i <= e2; i++) {
      const childVNode = c2[i];
      keyToNewIndexMap.set(childVNode.key, i);
    }

    const toBePatched = e2 - s2 + 1; // 新元素总个数
    const newIndexToOldIndexMap = new Array(toBePatched).fill(0); // 用来标记有没有被patch过

    for (let i = s1; i <= e1; i++) {
      const oldChild = c1[i];
      const newIndex = keyToNewIndexMap.get(oldChild.key);
      if (newIndex === undefined) {
        // 老的有，新的没有，删除老的
        unmount(oldChild);
      } else {
        // 标记已经被patch过
        newIndexToOldIndexMap[newIndex - s2] = i + 1;
        // 老的有，新的也有，更新
        patch(oldChild, c2[newIndex], container);
      }
    }

    // 获取最长递增子序列
    const increasingNewIndexSequence = getSequence(newIndexToOldIndexMap);
    let j = increasingNewIndexSequence.length - 1;

    // 创建新的并移动位置
    for (let i = toBePatched - 1; i >= 0; i--) {
      const index = s2 + i;
      const current = c2[index];
      const anchor = index + 1 < c2.length ? c2[index + 1].el : null;
      if (newIndexToOldIndexMap[i] === 0) {
        // 新增的元素
        patch(null, current, container, anchor);
      } else {
        if (i !== increasingNewIndexSequence[j]) {
          // 移动元素
          hostInsert(current.el, container, anchor);
        } else {
          j--;
        }
      }
    }
  };

  const patchChildren = (n1, n2, container) => {
    const c1 = n1.children;
    const c2 = n2.children;
    const prevShapeFlag = n1 && n1.shapeFlag;
    const shapeFlag = n2.shapeFlag;

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1);
      }
      if (c2 !== c1) {
        hostSetElementText(container, c2);
      }
    } else {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 两个都是数组
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // diff算法
          patchKeyedChildren(c1, c2, container); // 全量更新
        } else {
          // 新的是null
          unmountChildren(c1);
        }
      } else {
        // 老的是文本或 null，新的是数组或 null
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(container, '');
        }
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, container);
        }
      }
    }
  };

  const patchElement = (n1, n2) => {
    // 先复用节点
    // 再比较属性
    // 再比较儿子
    let el = (n2.el = n1.el);

    let oldProps = n1.props || {};
    let newProps = n2.props || {};

    patchProps(oldProps, newProps, el);

    patchChildren(n1, n2, el);
  };

  const processElement = (n1, n2, container, anchor) => {
    if (n1 === null) {
      mountElement(n2, container, anchor);
    } else {
      // 元素更新
      patchElement(n1, n2);
    }
  };

  const processFragment = (n1, n2, container) => {
    if (n1 === null) {
      mountChildren(n2.children, container);
    } else {
      patchChildren(n1, n2, container);
    }
  };

  const updateComponentPreRender = (instance, next) => {
    instance.next = null;
    // 实例上最新的虚拟节点
    instance.vnode = next;
    updateProps(instance, next.props);
  };

  function setupRenderEffect(instance, container, anchor) {
    const { render } = instance;
    const componentUpdateFn = () => {
      if (!instance.isMounted) {
        // 初始化
        const usbTree = render.call(instance.proxy);
        patch(null, usbTree, container, anchor);
        instance.subTree = usbTree;
        instance.isMounted = true;
      } else {
        // 更新
        const { next } = instance;
        if (next) {
          // 更新前拿到最新的属性
          updateComponentPreRender(instance, next);
        }
        const subTree = render.call(instance.proxy);
        patch(instance.subTree, subTree, container, anchor);
        instance.subTree = subTree;
      }
    };

    const effect = new ReactiveEffect(componentUpdateFn, () => queueJob(instance.update));
    const update = (instance.update = effect.run.bind(effect));
    update();
  }

  const mountComponent = (vnode, container, anchor) => {
    // 1. 创建组件实例
    const instance = (vnode.component = createComponentInstance(vnode));
    // 2. 给实例初始化赋值
    setupComponent(instance);
    // 3. 创建 effect
    setupRenderEffect(instance, container, anchor);
  };

  const shouldUpdateComponent = (n1, n2) => {
    const { props: prevProps, children: prevChildren } = n1;
    const { props: nextProps, children: nextChildren } = n2;

    if (prevProps === nextProps) {
      return false;
    }
    if (prevChildren || nextChildren) {
      return true;
    }
    return hasPropsChanged(prevProps, nextProps);
  };

  const updateComponent = (n1, n2) => {
    // instance.props 是响应式的，可以修改；属性的更新会导致视图更新
    // 对于组件，复用的是实例
    const instance = (n2.component = n1.component);

    if (shouldUpdateComponent(n1, n2)) {
      instance.next = n2;
      instance.update();
    }
  };

  const processComponent = (n1, n2, container, anchor) => {
    if (n1 === null) {
      mountComponent(n2, container, anchor);
    } else {
      updateComponent(n1, n2);
    }
  };

  const patch = (n1, n2, container, anchor = null) => {
    if (n1 === n2) return;

    // 判断两个元素是否相同，不相同则卸载老的再添加新的
    if (n1 && !isSameVnode(n1, n2)) {
      unmount(n1); // 删除老的
      n1 = null;
    }

    const { type, shapeFlag } = n2;

    switch (type) {
      case Text:
        processText(n1, n2, container);
        break;
      case Fragment:
        processFragment(n1, n2, container);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor);
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(n1, n2, container, anchor);
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
      patch(container._vnode || null, vnode, container);
    }
    container._vnode = vnode;
  };
  return {
    render,
  };
}

// 1. 当前项比最后一项大，直接push
// 2. 当前项比最后一项小，二分查找，找到第一个比当前项大的项，替换
function getSequence(arr: number[]): number[] {
  const len = arr.length;
  // 记录最长递增子序列的索引
  const result = [0];
  // 标记索引
  const p = new Array(len);
  let start;
  let end;
  let resultLastIndex = 0;

  for (let i = 0; i < len; i++) {
    let arrI = arr[i];
    if (arrI !== 0) {
      resultLastIndex = result[result.length - 1];

      if (arr[resultLastIndex] < arrI) {
        result.push(i);
        p[i] = resultLastIndex;
        continue;
      }

      start = 0;
      end = result.length - 1;

      while (start < end) {
        let mid = (start + end) >> 1;
        if (arr[result[mid]] < arrI) {
          start = mid + 1;
        } else {
          end = mid;
        }
      }

      if (arr[result[start]] > arrI) {
        result[start] = i;
        p[i] = result[start - 1];
      }
    }
  }

  // 回溯
  let i = result.length;
  let last = result[i - 1];
  while (i-- > 0) {
    result[i] = last;
    last = p[last];
  }

  return result;
}
