export function joinBy<Left, Right>(left: Left[], right: Right[], eq: (left: Left, right: Right) => boolean): Array<[Left, Right]> {
  let result = []

  let tmpRight = right.slice()

  top: for (const l of left) {
    if (tmpRight.length === 0) break

    for (let i = 0; i < tmpRight.length; i++) {
      const r = tmpRight[i]!
      if (eq(l, r)) {
        result.push([l, r] as [Left, Right])
        tmpRight.splice(i, 1)
        continue top
      }
    }
  }

  return result
}
