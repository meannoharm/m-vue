const queue = new Set<Function>();
let isFlushing = false;
const resolvedPromise = Promise.resolve();

export function queueJob(job) {
  queue.add(job);
  if (!isFlushing) {
    isFlushing = true;
    resolvedPromise.then(() => {
      isFlushing = false;
      const copy = [...queue];
      queue.clear();
      for (let i = 0; i < copy.length; i++) {
        const job = copy[i];
        job();
      }
      copy.length = 0;
    });
  }
}
