import { type Target, reactive, readonly } from './reactive';
import { isObject } from '@m-vue/shared';
import { track, trigger, ITERATE_KEY } from './effect';
import { ReactiveFlags, TriggerType } from './constants';

export class BaseReactiveHandler implements ProxyHandler<Target> {
  constructor(
    protected readonly _isReadonly = false,
    protected readonly _shallow = false,
  ) {}

  get(target, key, receiver) {
    const isReadonly = this._isReadonly;
    const shallow = this._shallow;

    if (key === ReactiveFlags.IS_REACTIVE) {
      return true;
    } else if (key === ReactiveFlags.RAW) {
      // 代理对象通过 raw 属性可以获取到原始对象
      return target;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    }

    if (!isReadonly) {
      track(target, 'get', key);
    }

    const res = Reflect.get(target, key, receiver);

    if (shallow) {
      return res;
    }

    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res);
    }

    return res;
  }
}

export class MutableReactiveHandler extends BaseReactiveHandler {
  constructor(shallow = false) {
    super(false, shallow);
  }
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
  }
  // 拦截 for ... in
  ownKeys(target) {
    track(target, 'ownKeys', ITERATE_KEY);
    return Reflect.ownKeys(target);
  }
  // 拦截 delete
  deleteProperty(target, key) {
    const hasKey = Object.prototype.hasOwnProperty.call(target, key);
    let oldValue = target[key];
    let result = Reflect.deleteProperty(target, key);
    if (hasKey) {
      trigger(target, TriggerType.DELETE, key, undefined, oldValue);
    }
    return result;
  }
}

export class ReadOnlyHandler extends BaseReactiveHandler {
  constructor(shallow = false) {
    super(true, shallow);
  }
  set(target, key) {
    console.warn(`Set operation on key "${key}" failed: target is readonly.`);
    return true;
  }
  deleteProperty(target, key) {
    console.warn(`Delete operation on key "${key}" failed: target is readonly.`);
    return true;
  }
}

export const mutableHandlers: ProxyHandler<object> = new MutableReactiveHandler();
export const shallowReactiveHandlers: ProxyHandler<object> = new MutableReactiveHandler(true);
export const readonlyHandlers: ProxyHandler<object> = new ReadOnlyHandler();
export const shallowReadonlyHandlers: ProxyHandler<object> = new ReadOnlyHandler(true);
