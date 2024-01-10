import { ref } from '@m-vue/reactivity';
import { defineComponent } from './apiDefineComponent';
import { Text, createVnode } from './vnode';
import { currentInstance } from './component';

export function defineAsyncComponent(source) {
  if (typeof source === 'function') {
    source = { loader: source };
  }
  const { loader, loadingComponent, errorComponent, delay, timeout } = source;
  let resolvedComp = null;
  return defineComponent({
    name: 'AsyncComponentWrapper',
    setup() {
      const instance = currentInstance!;

      if (resolvedComp) {
        return () => createInnerComp(resolvedComp, instance);
      }

      const loaded = ref(false);
      const error = ref();
      const delayed = ref(!!delay);

      loader()
        .then((comp) => {
          resolvedComp = comp;
          loaded.value = true;
        })
        .error((err) => {
          error.value = err;
        });

      if (delay) {
        setTimeout(() => {
          delayed.value = false;
        }, delay);
      }

      if (timeout != null) {
        setTimeout(() => {
          if (!loaded.value && !error.value) {
            const err = new Error(`Async component timed out after ${timeout}ms.`);
            error.value = err;
          }
        }, timeout);
      }

      return () => {
        if (loaded.value && resolvedComp) {
          return createInnerComp(resolvedComp, instance);
        } else if (error.value && errorComponent) {
          return createVnode(errorComponent, {
            error: error.value,
          });
        } else if (!delayed.value && loadingComponent) {
          return createVnode(loadingComponent);
        }
      };
    },
  });
}

function createInnerComp(comp, parent) {
  const { props, children } = parent;
  const vnode = createVnode(comp, props, children);
  return vnode;
}
