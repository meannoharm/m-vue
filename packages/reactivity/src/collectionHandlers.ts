import { isMap, isObject } from '@m-vue/shared';
import { ReactiveFlags, TriggerOpTypes } from './constants';
import { ITERATE_KEY, MAP_KEY_ITERATE_KEY, track, trigger } from './effect';
import { reactive, toRaw, toReadonly, toReactive } from './reactive';

type IterableCollections = Map<any, any> | Set<any>;
type WeakCollections = WeakMap<any, any> | WeakSet<any>;
type MapTypes = Map<any, any> | WeakMap<any, any>;
type SetTypes = Set<any> | WeakSet<any>;
type CollectionTypes = IterableCollections | WeakCollections;

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

// TODO: 还有 has 方法和 clear 方法没有追踪

const toShallow = <T extends unknown>(value: T): T => value;

function add(this: SetTypes, key: unknown) {
  const target = toRaw(this);
  const hadKey = target.has(key);
  const res = target.add(key);
  if (!hadKey) {
    trigger(target, TriggerOpTypes.ADD, key, key);
  }
  return res;
}

function deleteEntry(this: SetTypes, key: unknown) {
  const target = toRaw(this);
  const hadKey = target.has(key);
  const res = target.delete(key);
  if (hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, undefined);
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
    trigger(target, TriggerOpTypes.ADD, key, value, oldValue);
  } else if (value !== oldValue && (value === value || oldValue === oldValue)) {
    trigger(target, TriggerOpTypes.SET, key, value, oldValue);
  }
  return res;
}

function createForEach(isReadonly: boolean, isShallow: boolean) {
  return function (this: IterableCollections, callback, thisArg) {
    // wrap 函数把可代理的值转换为响应式数据
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
    const target = toRaw(this);
    if (!isReadonly) {
      track(target, 'iterate', ITERATE_KEY);
    }
    target.forEach((v, k) => {
      callback.call(thisArg, wrap(v), wrap(k), this);
    });
  };
}

function createIterableMethod(method: string | symbol, isReadonly: boolean, isShallow: boolean) {
  return function (this: IterableCollections, ...args): Iterable & Iterator {
    const target = toRaw(this) as any;

    const targetIsMap = isMap(target);
    const isPair = method === 'entries' || (method === Symbol.iterator && targetIsMap);
    const isKeyOnly = method === 'keys' && targetIsMap;
    const innerIterator = target[method](...args);

    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
    if (!isReadonly) {
      track(target, 'iterate', isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY);
    }

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

function createReadonlyMethod(type: TriggerOpTypes) {
  return function (this: CollectionTypes, ...args) {
    return type === TriggerOpTypes.DELETE
      ? false
      : type === TriggerOpTypes.CLEAR
        ? undefined
        : this;
  };
}

function createInstrumentation() {
  const mutableInstrumentations: Record<string, Function | number> = {
    get,
    add,
    set,
    delete: deleteEntry,
    forEach: createForEach(false, false),
  };
  const shallowInstrumentations: Record<string, Function | number> = {
    get,
    add,
    set,
    delete: deleteEntry,
    forEach: createForEach(false, true),
  };
  const readonlyInstrumentations: Record<string, Function | number> = {
    get,
    add: createReadonlyMethod(TriggerOpTypes.ADD),
    set: createReadonlyMethod(TriggerOpTypes.SET),
    delete: createReadonlyMethod(TriggerOpTypes.DELETE),
    forEach: createForEach(true, false),
  };
  const shallowReadonlyInstrumentations: Record<string, Function | number> = {
    get,
    add: createReadonlyMethod(TriggerOpTypes.ADD),
    set: createReadonlyMethod(TriggerOpTypes.SET),
    delete: createReadonlyMethod(TriggerOpTypes.DELETE),
    forEach: createForEach(true, true),
  };

  ['keys', 'values', 'entries', Symbol.iterator].forEach((method) => {
    mutableInstrumentations[method as string] = createIterableMethod(method, false, false);
    readonlyInstrumentations[method as string] = createIterableMethod(method, true, false);
    shallowInstrumentations[method as string] = createIterableMethod(method, false, true);
    shallowReadonlyInstrumentations[method as string] = createIterableMethod(method, true, true);
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
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.RAW) {
      return target;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    } else if (key === ReactiveFlags.IS_SHALLOW) {
      return isShallow;
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
