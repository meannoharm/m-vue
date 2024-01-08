import { hasOwn, isFunction, isObject } from '@m-vue/shared';
import { initProps } from './componentProps';
import { reactive, proxyRefs } from '@m-vue/reactivity';

export function createComponentInstance(vnode) {
  const instance = {
    data: null,
    vnode, // 组件的虚拟节点
    subTree: null, // 渲染的组件内容
    isMounted: false,
    update: null,
    propsOptions: vnode.type.props,
    props: {},
    attrs: {},
    proxy: null,
    render: null,
    setupState: {},
  };
  return instance;
}

const publicPropertiesMap = {
  $attrs: (i) => i.attrs,
};

const publicInstanceProxyHandlers = {
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

export function setupComponent(instance) {
  const { props, type } = instance.vnode;
  initProps(instance, props);
  // 代理组件渲染上下文
  instance.proxy = new Proxy(instance, publicInstanceProxyHandlers);

  const data = type.data;
  if (data) {
    if (!isFunction(data)) {
      console.warn('data must be a function');
    }
    instance.data = reactive(data.call(instance.proxy));
  }
  const { setup } = type;
  if (setup) {
    const setupContext = {};
    const setupResult = setup(instance.props, setupContext);
    if (isFunction(setupResult)) {
      instance.render = setupResult;
    } else if (isObject(setupResult)) {
      // 对内部 ref 去 value
      instance.setupState = proxyRefs(setupResult);
    }
  }
  if (!instance.render) {
    instance.render = type.render;
  }
  // instance.render = type.render;
}
