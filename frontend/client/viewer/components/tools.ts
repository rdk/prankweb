export type Order = 'asc' | 'desc';

export function getComparator<Key extends keyof any>(
  order: Order,
  orderBy: Key,
) {
  return order === 'desc'
    ? (a: any, b: any) => descendingComparator(a, b, orderBy)
    : (a: any, b: any) => -descendingComparator(a, b, orderBy);
}

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    //if the compared properties may be converted to numbers, then treat them so
    //this is because we store some numbers as strings...
    let aToCompare: any = a[orderBy];
    let bToCompare: any = b[orderBy];

    if (!isNaN(aToCompare) && !isNaN(bToCompare)) {
      aToCompare = Number(aToCompare);
      bToCompare = Number(bToCompare);
    }

    if (bToCompare < aToCompare) {
      return -1;
    }
    if (bToCompare > aToCompare) {
      return 1;
    }
    return 0;
}