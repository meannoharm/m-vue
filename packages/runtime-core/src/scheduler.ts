export interface SchedulerJob extends Function {}
export type SchedulerJobs = SchedulerJob | SchedulerJob[];

const queue: SchedulerJob[] = [];
const activePreFlushCbs: SchedulerJob[] = [];

const p = Promise.resolve();
let isFlushing = false;

export function nextTick(fn?: () => void): Promise<void> {
  return fn ? p.then(fn) : p;
}

export function queueJob(job: SchedulerJob) {
  if (!queue.includes(job)) {
    queue.push(job);
    queueFlush();
  }
}

export function queueFlush() {
  if (!isFlushing) {
    isFlushing = true;
    nextTick(flushJobs);
  }
}

export function queuePreFlushCb(cb) {
  queueCb(cb, activePreFlushCbs);
}

function queueCb(cb, activeQueue) {
  // 直接添加到对应的列表内就ok
  // todo 这里没有考虑 activeQueue 是否已经存在 cb 的情况
  // 然后在执行 flushJobs 的时候就可以调用 activeQueue 了
  activeQueue.push(cb);

  // 然后执行队列里面所有的 job
  queueFlush();
}

function flushJobs() {
  isFlushing = false;

  // 先执行 pre 类型的 job
  // 所以这里执行的job 是在渲染前的
  // 也就意味着执行这里的 job 的时候 页面还没有渲染
  flushPreFlushCbs();

  // 这里是执行 queueJob 的
  // 比如 render 渲染就是属于这个类型的 job
  let job;
  while ((job = queue.shift())) {
    if (job) {
      job();
    }
  }
}

function flushPreFlushCbs() {
  // 执行所有的 pre 类型的 job
  for (let i = 0; i < activePreFlushCbs.length; i++) {
    activePreFlushCbs[i]();
  }
}
