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
    let aToCompare: any = a[orderBy];
    let bToCompare: any = b[orderBy];

    //if the compared properties may be converted to numbers, then treat them so
    //this is because we store some numbers as strings...
    if (!isNaN(aToCompare) && !isNaN(bToCompare)) {
      aToCompare = Number(aToCompare);
      bToCompare = Number(bToCompare);
    }

    //if the compared properties are arrays, then compare their lengths
    if (Array.isArray(aToCompare) && Array.isArray(bToCompare)) {
      aToCompare = aToCompare.length;
      bToCompare = bToCompare.length;
    }

    if (bToCompare < aToCompare) {
      return -1;
    }
    if (bToCompare > aToCompare) {
      return 1;
    }
    return 0;
}