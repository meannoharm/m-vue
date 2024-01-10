import { isFunction } from '@m-vue/shared';

export function defineComponent(options) {
  return isFunction(options) ? { setup: options, name: options.name } : options;
}
