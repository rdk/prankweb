import { useEffect, useRef } from 'react';
import { ClientTaskLocalStorageData, ServerTaskLocalStorageData } from "../../custom-types";

export type Order = 'asc' | 'desc';

export function isInstanceOfClientTaskLocalStorageData(obj: any): obj is ClientTaskLocalStorageData {
    return obj.discriminator === 'client';
}

export function isInstanceOfServerTaskLocalStorageData(obj: any): obj is ServerTaskLocalStorageData {
    return obj.discriminator === 'server';
}

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

/**
* Calculates a color with the given alpha value.
* @param alpha Alpha value of the color
* @param bgColor Color in the hex format #RRGGBB (or RRGGBB)
* @returns Calculated color in the format rgba(R,G,B,alpha)
*/
export function calculateColorWithAlpha(alpha: number, bgColor: string) {
    const color = (bgColor.charAt(0) === '#') ? bgColor.substring(1, 7) : bgColor;
    const r = parseInt(color.substring(0, 2), 16); // hexToR
    const g = parseInt(color.substring(2, 4), 16); // hexToG
    const b = parseInt(color.substring(4, 6), 16); // hexToB
    return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Hook that calls the given callback function in the given interval.
 * Taken from https://overreacted.io/making-setinterval-declarative-with-react-hooks/
 * @param callback Callback function
 * @param delay Delay in milliseconds
 */
export const useInterval = (callback: any, delay: number) => {
    const savedCallback = useRef<any>();

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);


    useEffect(() => {
        function tick() {
            savedCallback.current();
        }
        if (delay !== null) {
            const id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
};