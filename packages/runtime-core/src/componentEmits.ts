import { camelize, hyphenate, toHandlerKey } from '@m-vue/shared';
// 发射自定义事件的本质就是根据事件名称去 props 数据对象中寻找对应的事件处理函数并执行
export function emit(instance, event: string, ...args) {
  const props = instance.props;
  // eg: event 是 'click' 那么这里取的就是 onClick
  // 如果是烤肉串命名的话，需要转换成  change-page -> changePage
  let handler = props[toHandlerKey(camelize(event))];

  if (!handler) {
    // 检测 event 是不是 kebab-case 类型
    handler = props[toHandlerKey(hyphenate(event))];
  }

  if (handler) {
    handler(...args);
  }
}
