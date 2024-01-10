import { isArray } from '@m-vue/shared';

export type SchedulerJob = Function & { pre: boolean };
export type SchedulerJobs = SchedulerJob | SchedulerJob[];

let isFlushing = false;
let isFlushPending = false;

const queue: SchedulerJob[] = [];

const pendingPostFlushCbs: SchedulerJob[] = [];
let activePostFlushCbs: SchedulerJob[] | null = null;

const resolvedPromise: Promise<any> = Promise.resolve();
let currentFlushPromise: Promise<void> | null = null;

export function nextTick(fn?: () => void): Promise<void> {
  const p = currentFlushPromise || resolvedPromise;
  return fn ? p.then(fn) : p;
}

export function queueJob(job: SchedulerJob) {
  if (!queue.includes(job)) {
    queue.push(job);
  }
  queueFlush();
}

export function queuePostFlushCb(cb: SchedulerJobs) {
  if (!isArray(cb)) {
    if (!pendingPostFlushCbs.includes(cb)) {
      pendingPostFlushCbs.push(cb);
    }
  } else {
    // if cb is an array, it is a component lifecycle hook which can only be
    // triggered by a job, which is already deduped in the main queue, so
    // we can skip duplicate check here to improve perf
    pendingPostFlushCbs.push(...cb);
  }
  queueFlush();
}

function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true;
    currentFlushPromise = resolvedPromise.then(flushJobs);
  }
}

function flushJobs() {
  isFlushPending = false;
  isFlushing = true;
  try {
    for (let i = 0; i < queue.length; i++) {
      const job = queue[i];
      job();
    }
  } finally {
    // 刷新后执行
    queue.length = 0;
    flushPostFlushCbs();
    isFlushing = false;
    currentFlushPromise = null;
    // TODO 这里需要追踪 job 的运行次数，防止无线循环，先注释了
    // if (queue.length || pendingPostFlushCbs.length) {
    //   flushJobs();
    // }
  }
}

function flushPostFlushCbs() {
  if (pendingPostFlushCbs.length) {
    activePostFlushCbs = [...new Set(pendingPostFlushCbs)];
    pendingPostFlushCbs.length = 0;
    for (let i = 0; i < activePostFlushCbs.length; i++) {
      activePostFlushCbs[i]();
    }
    activePostFlushCbs = null;
  }
}

// TODO 处理带 pre 的 job, 如 watch
// export function flushPreFlushCbs(instance) {}
