import { reactive } from './reactive';
import { isObject } from '@m-vue/shared';
import { track, trigger } from './effect';

// 标记是否已经是响应式数据
export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive',
}

export const mutableHandlers = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true;
    }
    track(target, 'get', key);
    let res = Reflect.get(target, key, receiver);

    if (isObject(res)) {
      return reactive(res);
    }

    return res;
  },
  set(target, key, value, receiver) {
    let oldValue = target[key];
    let result = Reflect.set(target, key, value, receiver);
    if (oldValue !== value) {
      trigger(target, 'set', key, value, oldValue);
    }
    return result;
  },
};
