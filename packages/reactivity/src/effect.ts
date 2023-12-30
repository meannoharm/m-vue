import { TriggerType } from './constants';

export let activeEffect = undefined;

export const ITERATE_KEY = Symbol('iterate');

function cleanupEffect(effect) {
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
    public scheduler,
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

export const effect = (fn, options = {}) => {
  const _effect = new ReactiveEffect(fn, options.scheduler);

  _effect.run();

  const runner = _effect.run.bind(_effect);
  runner._effect = _effect;
  return runner;
};

const targetMap = new WeakMap();
export const track = (target, type, key) => {
  if (!activeEffect) return;
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

export const trigger = (target, type, key, newValue, oldValue) => {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const effects = depsMap.get(key);
  const iterateEffects = depsMap.get(ITERATE_KEY);

  const effectsToRun = new Set();
  // 将与key相关的effect添加到effectsToRun
  effects &&
    effects.forEach((effect) => {
      effectsToRun.add(effect);
    });

  if (type === TriggerType.ADD || type === TriggerType.DELETE) {
    // 将与ITERATE_KEY相关的effect添加到effectsToRun
    iterateEffects &&
      iterateEffects.forEach((effect) => {
        effectsToRun.add(effect);
      });
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
