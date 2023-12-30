import { reactive } from './reactive';
import { isObject } from '@m-vue/shared';
import { track, trigger, ITERATE_KEY } from './effect';
import { ReactiveFlags, TriggerType } from './constants';

export const mutableHandlers = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true;
    }
    // 代理对象通过 raw 属性可以获取到原始对象
    if (key === ReactiveFlags.RAW) {
      return target;
    }

    track(target, 'get', key);
    const res = Reflect.get(target, key, receiver);

    if (isObject(res)) {
      return reactive(res);
    }

    return res;
  },
  set(target, key, value, receiver) {
    const oldValue = target[key];
    const type = Object.prototype.hasOwnProperty.call(target, key)
      ? TriggerType.SET
      : TriggerType.ADD;
    const result = Reflect.set(target, key, value, receiver);
    // target === receiver[ReactiveFlags.RAW] 说明 receiver 是 target 的代理对象
    if (target === receiver[ReactiveFlags.RAW]) {
      // 因为 NaN !== NaN 所以需要判断一下
      if (oldValue !== value && (oldValue === oldValue || value === value)) {
        trigger(target, type, key, value, oldValue);
      }
    }
    return result;
  },
  // 拦截 for ... in
  ownKeys(target) {
    track(target, 'ownKeys', ITERATE_KEY);
    return Reflect.ownKeys(target);
  },
  // 拦截 delete
  deleteProperty(target, key) {
    const hasKey = Object.prototype.hasOwnProperty.call(target, key);
    let oldValue = target[key];
    let result = Reflect.deleteProperty(target, key);
    if (hasKey) {
      trigger(target, TriggerType.DELETE, key, undefined, oldValue);
    }
    return result;
  },
};
