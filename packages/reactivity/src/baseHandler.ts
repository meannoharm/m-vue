import { reactive } from './reactive';
import { isObject } from '@m-vue/shared';
import { track, trigger, ITERATE_KEY, TriggerType } from './effect';

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
    const type = Object.prototype.hasOwnProperty.call(target, key)
      ? TriggerType.SET
      : TriggerType.ADD;
    let oldValue = target[key];
    let result = Reflect.set(target, key, value, receiver);
    // 因为 NaN !== NaN 所以需要判断一下
    if (oldValue !== value && (oldValue === oldValue || value === value)) {
      trigger(target, type, key, value, oldValue);
    }
    return result;
  },
  // 拦截 for in
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
