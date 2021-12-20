// @ts-nocheck
import {Protael} from "./protael.js";
import {ProtaelContent} from "./protael-model";

import "./protael.css";

/**
 * Render Protael into element with given ID, remove any previous content.
 */
export function renderProtael(content: ProtaelContent, elementId: string): any {
  const element = document.getElementById(elementId)!;
  resetElementContent(element);
  const protael = createProtael(content, elementId);
  protael.draw();
  return protael;
}

function resetElementContent(element: Element): void {
  element.innerHTML = "";
}

function createProtael(content: ProtaelContent, elementId: string,): any {
  const showControls = true;
  try {
    return Protael(content, elementId, showControls);
  } catch (ex) {
    console.error("Can't create protael.", ex);
    throw ex;
  }
}
