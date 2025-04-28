const ctx = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  schedule: (_cb?: (arg: unknown) => unknown, _arg?: unknown) => {},
}
const item = {}

const cb = () => {return item}

const getItem = () => {
  ctx.schedule(cb);
  ctx.schedule(cb, -1);
}

export default getItem
