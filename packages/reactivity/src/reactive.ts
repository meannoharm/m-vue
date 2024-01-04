import { isObject } from '@m-vue/shared';
import {
  mutableHandlers,
  readonlyHandlers,
  shallowReactiveHandlers,
  shallowReadonlyHandlers,
} from './baseHandlers';
import {
  mutableCollectionHandlers,
  readonlyCollectionHandlers,
  shallowCollectionHandlers,
  shallowReadonlyCollectionHandlers,
} from './collectionHandlers';
import { ReactiveFlags } from './constants';

// 做一次缓存
const reactiveMap = new WeakMap();
export interface Target {
  [ReactiveFlags.IS_REACTIVE]?: boolean;
  [ReactiveFlags.RAW]?: any;
  [ReactiveFlags.IS_READONLY]?: any;
}
export const isReactive = (value) => {
  return !!(value && value[ReactiveFlags.IS_REACTIVE]);
};

// 将数据转换成响应式数据
export const createReactive = (
  target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<Target, any>,
) => {
  if (!isObject(target)) {
    return;
  }

  if (target[ReactiveFlags.IS_REACTIVE]) {
    // 已经是响应式数据,直接返回
    return target;
  }

  let existingProxy = proxyMap.get(target);

  if (existingProxy) {
    // 同一个对象,直接返回
    return existingProxy;
  }

  const proxy = new Proxy(target, baseHandlers);
  proxyMap.set(target, proxy);

  return proxy;
};

export function reactive(target) {
  return createReactive(target, false, mutableHandlers, mutableCollectionHandlers, reactiveMap);
}

export function shallowReactive(target) {
  return createReactive(
    target,
    false,
    shallowReactiveHandlers,
    shallowCollectionHandlers,
    reactiveMap,
  );
}

export function readonly(target) {
  return createReactive(target, true, readonlyHandlers, readonlyCollectionHandlers, reactiveMap);
}

export function shallowReadonly(target) {
  return createReactive(
    target,
    true,
    shallowReadonlyHandlers,
    shallowReadonlyCollectionHandlers,
    reactiveMap,
  );
}

export function toRaw<T>(observed: T): T {
  return (observed && toRaw(observed[ReactiveFlags.RAW])) || observed;
}

export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY];
}

export function isProxy(value) {
  return !!value[ReactiveFlags.RAW];
}
