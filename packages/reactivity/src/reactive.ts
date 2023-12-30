import { isObject } from '@m-vue/shared';
import { mutableHandlers } from './baseHandler';
import { ReactiveFlags } from './constants';

// 做一次缓存
const reactiveMap = new WeakMap();

export const isReactive = (value) => {
  return !!(value && value[ReactiveFlags.IS_REACTIVE]);
};

// 将数据转换成响应式数据
export const reactive = (target) => {
  if (isObject(target)) {
    return;
  }

  if (target[ReactiveFlags.IS_REACTIVE]) {
    // 已经是响应式数据,直接返回
    return target;
  }

  let existingProxy = reactiveMap.get(target);

  if (existingProxy) {
    // 同一个对象,直接返回
    return existingProxy;
  }

  const proxy = new Proxy(target, mutableHandlers);

  reactiveMap.set(target, proxy);

  return proxy;
};
