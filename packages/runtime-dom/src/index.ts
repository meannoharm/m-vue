import { extend } from '@m-vue/shared';
import { nodeOps } from './nodeOps';
import { patchProp } from './patchProps';
import { createRenderer } from '@m-vue/runtime-core';

const renderOptions = extend(nodeOps, { patchProp });

export function render(vnode, container) {
  createRenderer(renderOptions).render(vnode, container);
}

export * from '@m-vue/runtime-core';
