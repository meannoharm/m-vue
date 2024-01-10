import { LifecycleHooks } from './enums';

export function injectHook(type: LifecycleHooks, hook: Function, target, prepend: boolean = false) {
  if (target) {
    const hooks = target[type] || (target[type] = []);
    if (prepend) {
      hooks.unshift(hook);
    } else {
      hooks.push(hook);
    }
  }
}

export const createHook = (lifecycle: LifecycleHooks) => (hook, target) => {
  injectHook(lifecycle, (...args: unknown[]) => hook(...args), target);
};

export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT);
export const onMounted = createHook(LifecycleHooks.MOUNTED);
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE);
export const onUpdated = createHook(LifecycleHooks.UPDATED);
export const onBeforeUnmount = createHook(LifecycleHooks.BEFORE_UNMOUNT);
export const onUnmounted = createHook(LifecycleHooks.UNMOUNTED);
