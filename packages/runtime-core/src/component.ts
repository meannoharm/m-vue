import { isFunction, isObject } from '@m-vue/shared';
import { publicInstanceProxyHandlers } from './componentPublicInstance';
import { initProps } from './componentProps';
import { initSlots } from './componentSlots';
import { emit } from './componentEmits';
import { reactive, proxyRefs } from '@m-vue/reactivity';
export type Data = Record<string, unknown>;

export function createComponentInstance(vnode) {
  const instance = {
    data: null,
    vnode, // 组件的虚拟节点
    subTree: null, // 渲染的组件内容
    effect: null,
    update: null, // 组件的effect函数，用于更新组件
    propsOptions: vnode.type.props,
    props: {},
    attrs: {},
    proxy: null,
    render: null,
    // setup 返回的data
    setupState: {},
    emit: () => {},
    slots: {},
    // 生命周期相关
    isMounted: false,
    isUmmounted: false,
    bc: null,
    c: null,
    bm: null,
    m: null,
    bu: null,
    u: null,
    bum: null,
    um: null,
  };

  instance.emit = emit.bind(null, instance);

  return instance;
}

export function setupComponent(instance) {
  const { props, type, children } = instance.vnode;
  const Component = type;
  initProps(instance, props);
  initSlots(instance, children);
  // 代理组件渲染上下文
  instance.proxy = new Proxy(instance, publicInstanceProxyHandlers);

  const data = Component.data;
  if (data) {
    if (!isFunction(data)) {
      console.warn('data must be a function');
    }
    instance.data = reactive(data.call(instance.proxy));
  }
  const { setup } = Component;
  if (setup) {
    setCurrentInstance(instance);
    const setupContext = createSetupContext(instance);
    const setupResult = setup(instance.props, setupContext);
    setCurrentInstance(null);
    handleSetupResult(instance, setupResult);
  } else {
    finishComponentSetup(instance);
  }
}

function handleSetupResult(instance, setupResult) {
  if (isFunction(setupResult)) {
    instance.render = setupResult;
  } else if (isObject(setupResult)) {
    // 对内部 ref 去 value
    instance.setupState = proxyRefs(setupResult);
  }
  finishComponentSetup(instance);
}

function finishComponentSetup(instance) {
  const Component = instance.type;
  if (!instance.render) {
    instance.render = Component.render;
  }
}

function createSetupContext(instance) {
  console.log('初始化 setup context');
  return {
    attrs: instance.attrs,
    slots: instance.slots,
    emit: instance.emit,
    expose: () => {}, // TODO 实现 expose 函数逻辑
  };
}

export let currentInstance = null;
// 这个接口暴露给用户，用户可以在 setup 中获取组件实例 instance
export function getCurrentInstance(): any {
  return currentInstance;
}

export function setCurrentInstance(instance) {
  currentInstance = instance;
}
