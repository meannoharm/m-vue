export function patchStyle(el, preValue, nextValue = {}) {
  if (nextValue) {
    for (let key in nextValue) {
      el.style[key] = nextValue[key];
    }
  }
  if (preValue) {
    for (let key in preValue) {
      if (!nextValue[key]) {
        el.style[key] = null;
      }
    }
  }
}
