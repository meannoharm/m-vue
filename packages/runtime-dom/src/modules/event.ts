function createInvoker(callback) {
  const invoker = (e) => invoker.value(e);
  invoker.value = callback;
  return;
}

export function patchEvent(el, eventName, nextValue) {
  let invokers = el._vei || (el._vei = {});
  let exits = invokers[eventName];

  if (exits && nextValue) {
    exits.value = nextValue;
  } else {
    // onClick -> click
    let event = eventName.slice(2).toLowerCase();

    if (nextValue) {
      const invoker = (invokers[eventName] = createInvoker(nextValue));
      // 绑定自定义事件
      el.addEventListener(event, invoker);
    } else if (exits) {
      el.removeEventListener(event, exits);
      invokers[eventName] = null;
    }
  }
}
