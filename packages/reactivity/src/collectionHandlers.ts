import { isMap, isObject } from '@m-vue/shared';
import { ReactiveFlags, TriggerOpType } from './constants';
import { ITERATE_KEY, MAP_KEY_ITERATE_KEY, track, trigger } from './effect';
import { reactive, toRaw } from './reactive';

type IterableCollections = Map<any, any> | Set<any>;
type WeakCollections = WeakMap<any, any> | WeakSet<any>;
type MapTypes = Map<any, any> | WeakMap<any, any>;
type SetTypes = Set<any> | WeakSet<any>;

interface Iterable {
  [Symbol.iterator](): Iterator;
}

interface Iterator {
  next(value?: any): IterationResult;
}

interface IterationResult {
  value: any;
  done: boolean;
}

function add(this: SetTypes, key: unknown) {
  const target = toRaw(this);
  const hadKey = target.has(key);
  const res = target.add(key);
  if (!hadKey) {
    trigger(target, TriggerOpType.ADD, key, key);
  }
  return res;
}

function deleteEntry(this: SetTypes, key: unknown) {
  const target = toRaw(this);
  const hadKey = target.has(key);
  const res = target.delete(key);
  if (hadKey) {
    trigger(target, TriggerOpType.DELETE, key, undefined);
  }
  return res;
}

function get(this: MapTypes, key: unknown) {
  const target = toRaw(this);
  const had = target.has(key);
  track(target, 'get', key);
  if (had) {
    const res = target.get(key);
    return isObject(res) ? reactive(res) : res;
  }
}

function set(this: MapTypes, key: unknown, value: unknown) {
  const target = toRaw(this);
  const had = target.has(key);

  const oldValue = target.get(key);
  const rawValue = toRaw(value);
  const res = target.set(key, rawValue);
  if (!had) {
    trigger(target, TriggerOpType.ADD, key, value, oldValue);
  } else if (value !== oldValue && (value === value || oldValue === oldValue)) {
    trigger(target, TriggerOpType.SET, key, value, oldValue);
  }
  return res;
}

function createForEach() {
  return function (this: IterableCollections, callback, thisArg) {
    // wrap 函数把可代理的值转换为响应式数据
    const wrap = (val) => (isObject(val) ? reactive(val) : val);
    const target = toRaw(this);
    track(target, 'iterate', ITERATE_KEY);
    target.forEach((v, k) => {
      callback.call(thisArg, wrap(v), wrap(k), this);
    });
  };
}

function createIterableMethod(method: string | symbol) {
  return function (this: IterableCollections, ...args): Iterable & Iterator {
    const target = toRaw(this) as any;

    const targetIsMap = isMap(target);
    const isPair = method === 'entries' || (method === Symbol.iterator && targetIsMap);
    const isKeyOnly = method === 'keys' && targetIsMap;
    const innerIterator = target[method](...args);

    const wrap = (entry) => (isObject(entry) ? reactive(entry) : entry);

    track(target, 'iterate', isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY);

    return {
      next() {
        const { value, done } = innerIterator.next();
        return done
          ? {
              value,
              done,
            }
          : {
              value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
              done,
            };
      },
      [Symbol.iterator]() {
        return this;
      },
    };
  };
}

function createInstrumentation() {
  const mutableInstrumentations: Record<string, Function | number> = {
    add,
    delete: deleteEntry,
    get,
    set,
    forEach: createForEach(),
  };
  const shallowInstrumentations: Record<string, Function | number> = {
    add,
    delete: deleteEntry,
    get,
    set,
  };
  const readonlyInstrumentations: Record<string, Function | number> = {
    get,
    forEach: createForEach(),
  };
  const shallowReadonlyInstrumentations: Record<string, Function | number> = {
    get,
  };

  ['keys', 'values', 'entries', Symbol.iterator].forEach((method) => {
    mutableInstrumentations[method as string] = createIterableMethod(method);
    readonlyInstrumentations[method as string] = createIterableMethod(method);
    shallowInstrumentations[method as string] = createIterableMethod(method);
    shallowReadonlyInstrumentations[method as string] = createIterableMethod(method);
  });

  return [mutableInstrumentations, readonlyInstrumentations, shallowInstrumentations];
}

const [
  mutableInstrumentations,
  readonlyInstrumentations,
  shallowInstrumentations,
  shallowReadonlyInstrumentations,
] = createInstrumentation();

function createInstrumentationGetter(isReadonly: boolean, isShallow: boolean) {
  const instrumentations = isReadonly
    ? isShallow
      ? shallowReadonlyInstrumentations
      : readonlyInstrumentations
    : isShallow
      ? shallowInstrumentations
      : mutableInstrumentations;
  return function (target, key, receiver) {
    if (key === ReactiveFlags.RAW) {
      return target;
    }
    if (key === 'size') {
      track(target, 'get', ITERATE_KEY);
      return Reflect.get(target, key, target);
    }
    return instrumentations[key];
  };
}

export const mutableCollectionHandlers: ProxyHandler<SetTypes | MapTypes> = {
  get: createInstrumentationGetter(false, false),
};

export const shallowCollectionHandlers: ProxyHandler<SetTypes | MapTypes> = {
  get: createInstrumentationGetter(false, true),
};

export const readonlyCollectionHandlers: ProxyHandler<SetTypes | MapTypes> = {
  get: createInstrumentationGetter(true, false),
};

export const shallowReadonlyCollectionHandlers: ProxyHandler<SetTypes | MapTypes> = {
  get: createInstrumentationGetter(true, true),
};
