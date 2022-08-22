import LiteMol from "litemol";
import {LiteMolPrankWebSpecification} from "./litemol-specification";

import "litemol/dist/css/LiteMol-plugin.css";
import "./litemol.css";

const HTML_ELEMENT_ID = "application-litemol";

export function createLiteMolPlugin() {
  console.info(`Using LiteMol version ${LiteMol.Plugin.VERSION.number}`);
  const plugin = LiteMol.Plugin.create({
    "target": document.getElementById(HTML_ELEMENT_ID)!,
    "viewportBackground": "#e7e7e7",
    "layoutState": {
      "hideControls": true,
      "isExpanded": false,
      "collapsedControlsLayout":
      LiteMol.Bootstrap.Components.CollapsedControlsLayout.Landscape,
    },
    "customSpecification": LiteMolPrankWebSpecification,
  });
  // Set how should be the top region rendered.
  plugin.command(LiteMol.Bootstrap.Command.Layout.SetState, {
    "regionStates": {
      [LiteMol.Bootstrap.Components.LayoutRegion.Top]: "Sticky"
    }
  });
  return plugin;
}