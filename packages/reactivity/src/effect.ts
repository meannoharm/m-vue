import { isMap } from '@m-vue/shared';
import { TriggerOpTypes } from './constants';

export type EffectScheduler = (...args: any[]) => any;

export let activeEffect = undefined;

export const ITERATE_KEY = Symbol('iterate');
export const MAP_KEY_ITERATE_KEY = Symbol('Map key iterate');

function cleanupEffect(effect: ReactiveEffect) {
  const { deps } = effect;
  for (let i = 0; i < deps.length; i++) {
    deps[i].delete(effect);
  }
  effect.deps.length = 0;
}

export class ReactiveEffect {
  public parent = null;
  // 记录依赖其的属性
  public deps = [];
  public active = true;
  constructor(
    public fn,
    public scheduler?: EffectScheduler,
  ) {}

  // 执行effect
  run() {
    if (!this.active) {
      this.fn();
    }

    // 依赖收集
    try {
      this.parent = activeEffect;
      activeEffect = this;

      cleanupEffect(this);
      this.fn();
    } finally {
      activeEffect = this.parent;
      this.parent = null;
    }
  }

  stop() {
    if (this.active) {
      this.active = false;
      if (!activeEffect) {
        cleanupEffect(this);
      }
    }
  }
}

interface ReactiveEffectOptions {
  scheduler?: EffectScheduler;
}

export const effect = (fn: () => any, options: ReactiveEffectOptions = {}) => {
  const _effect = new ReactiveEffect(fn, options.scheduler);

  _effect.run();

  const runner = _effect.run.bind(_effect);
  runner._effect = _effect;
  return runner;
};

export let shouldTrack = true;
export function pauseTracking() {
  shouldTrack = false;
}
export function resetTracking() {
  shouldTrack = true;
}

const targetMap = new WeakMap();
export const track = (target, type, key) => {
  if (!activeEffect || !shouldTrack) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, (dep = new Set()));
  }
  trackEffects(dep);
};

export const trackEffects = (dep) => {
  if (activeEffect) {
    let shouldTrack = !dep.has(activeEffect);
    if (shouldTrack) {
      dep.add(activeEffect);
      // 存放属性对应的Set<ReactiveEffect>
      activeEffect.deps.push(dep);
    }
  }
};

export const trigger = (
  target: object,
  type,
  key: unknown,
  newValue?: unknown,
  oldValue?: unknown,
) => {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  const effectsToRun = new Set();

  const effects = depsMap.get(key);
  // 将与key相关的effect添加到effectsToRun
  if (effects) {
    effects.forEach((effect) => {
      effectsToRun.add(effect);
    });
  }

  const iterateEffects = depsMap.get(ITERATE_KEY);
  if (
    type === TriggerOpTypes.ADD ||
    type === TriggerOpTypes.DELETE ||
    (type === TriggerOpTypes.SET && isMap(target))
  ) {
    // 将与ITERATE_KEY相关的effect添加到effectsToRun
    if (iterateEffects) {
      iterateEffects.forEach((effect) => {
        effectsToRun.add(effect);
      });
    }
  }

  if (type === TriggerOpTypes.ADD && Array.isArray(target)) {
    // 如果是数组，且新增的是索引，需要触发length属性的effect
    const lengthEffect = depsMap.get('length');
    if (lengthEffect) {
      lengthEffect.forEach((effect) => {
        effectsToRun.add(effect);
      });
    }
  }

  if (Array.isArray(target) && key === 'length') {
    // 对于索引大于或等于新的 length 值的元素
    // 需要把所有相关联的副作用函数取出并添加到 effectsToRun 中待执行
    depsMap.forEach((effects, index) => {
      if (index >= newValue) {
        effectsToRun.add(effects);
      }
    });
  }

  // ADD 和 DELETE 时，触发 MAP_KEY_ITERATE_KEY 相关的 effect
  // keys() 方法收集时，追踪了 MAP_KEY_ITERATE_KEY
  if ((type === TriggerOpTypes.ADD || type === TriggerOpTypes.DELETE) && isMap(target)) {
    const iterateEffects = depsMap.get(MAP_KEY_ITERATE_KEY);
    if (iterateEffects) {
      effectsToRun.add(iterateEffects);
    }
  }

  triggerEffect(effectsToRun);
};

export const triggerEffect = (effects) => {
  // 执行前拷贝，防止在执行effect时，被修改
  effects = new Set(effects);
  effects.forEach((effect) => {
    if (effect.active) {
      if (effect !== activeEffect) {
        if (effect.scheduler) {
          effect.scheduler(effect);
        } else {
          effect.run();
        }
      }
    }
  });
};
