import { hasOwn } from '@m-vue/shared';
import { shallowReactive } from 'packages/reactivity/src/reactive';

export function initProps(instance, rawProps) {
  const props: Record<string, any> = {};
  const attrs: Record<string, any> = {};

  const options = instance.type.propsOptions || {};

  if (rawProps) {
    for (let key in rawProps) {
      const value = rawProps[key];
      if (hasOwn(options, key)) {
        props[key] = value;
      } else {
        // attrs
        attrs[key] = value;
      }
    }
  }
  // props 不希望在组件内部被更改， 但是props是响应式的，因为后续属性变化要更新视图
  instance.props = shallowReactive(props);
  instance.attrs = attrs;
}
