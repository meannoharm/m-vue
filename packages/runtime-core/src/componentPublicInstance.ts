import { hasOwn } from '@m-vue/shared';

export const publicPropertiesMap = {
  $el: (i) => i.vnode.el,
  $attrs: (i) => i.attrs,
  $emit: (i) => i.emit,
  $slots: (i) => i.slots,
};

export const publicInstanceProxyHandlers = {
  get(target, key) {
    const { data, props, setupState } = target;
    if (data && hasOwn(data, key)) {
      return data[key];
    } else if (hasOwn(setupState, key)) {
      return setupState[key];
    } else if (props && hasOwn(props, key)) {
      return props[key];
    }
    let getter = publicPropertiesMap[key];
    if (getter) {
      return getter(target);
    }
  },
  set(target, key, value) {
    const { data, props, setupState } = target;
    if (data && hasOwn(data, key)) {
      data[key] = value;
      return true;
    } else if (hasOwn(setupState, key)) {
      setupState[key] = value;
      return true;
    } else if (props && hasOwn(props, key)) {
      console.warn('attempting to mutate prop "' + key + '"');
      return false;
    }
    return true;
  },
};
