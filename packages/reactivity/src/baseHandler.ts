import { type Target, reactive, readonly, toRaw } from './reactive';
import { isObject } from '@m-vue/shared';
import { track, trigger, pauseTracking, resetTracking, ITERATE_KEY } from './effect';
import { ReactiveFlags, TriggerOpType } from './constants';

const arrayInstrumentations = {};
['includes', 'indexOf', 'lastIndexOf'].forEach((method) => {
  const originMethod = Array.prototype[method];
  arrayInstrumentations[method] = function (...args) {
    let res = originMethod.apply(this, args);
    if (res === -1 || res === false) {
      res = originMethod.apply(this[ReactiveFlags.RAW], args);
    }
    return res;
  };
});
['push', 'pop', 'shift', 'unshift', 'splice'].forEach((method) => {
  const originMethod = Array.prototype[method];
  arrayInstrumentations[method] = function (...args) {
    pauseTracking();
    const res = originMethod.apply(this, args);
    resetTracking();
    return res;
  };
});

export class BaseReactiveHandler implements ProxyHandler<Target> {
  constructor(
    protected readonly _isReadonly = false,
    protected readonly _shallow = false,
  ) {}

  get(target, key, receiver) {
    const isReadonly = this._isReadonly;
    const shallow = this._shallow;

    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.RAW) {
      // 代理对象通过 raw 属性可以获取到原始对象
      return target;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    } else if (key === ReactiveFlags.IS_SHALLOW) {
      return shallow;
    }

    // 拦截数组方法，实现依赖收集
    if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
      return Reflect.get(arrayInstrumentations, key, receiver);
    }

    if (!isReadonly && typeof key !== 'symbol') {
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
    const type = Array.isArray(target)
      ? Number(key) < target.length
        ? TriggerOpType.SET
        : TriggerOpType.ADD
      : Object.prototype.hasOwnProperty.call(target, key)
        ? TriggerOpType.SET
        : TriggerOpType.ADD;
    const result = Reflect.set(target, key, value, receiver);
    // target === receiver[ReactiveFlags.RAW] 说明 receiver 是 target 的代理对象
    if (target === toRaw(receiver)) {
      // 因为 NaN !== NaN 所以需要判断一下
      if (oldValue !== value && (oldValue === oldValue || value === value)) {
        trigger(target, type, key, value, oldValue);
      }
    }
    return result;
  }
  // 拦截 for ... in
  ownKeys(target) {
    track(target, 'ownKeys', Array.isArray(target) ? 'length' : ITERATE_KEY);
    return Reflect.ownKeys(target);
  }
  // 拦截 delete
  deleteProperty(target, key) {
    const hasKey = Object.prototype.hasOwnProperty.call(target, key);
    let oldValue = target[key];
    let result = Reflect.deleteProperty(target, key);
    if (hasKey) {
      trigger(target, TriggerOpType.DELETE, key, undefined, oldValue);
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
