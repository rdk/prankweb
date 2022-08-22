import {waitForTaskToFinish} from "./task-view/task-view";
import {renderProteinView} from "./analyze-view/application";

import "../bootstrap.scss";

(function initialize() {
  waitForTaskToFinish(renderProteinView);
})();
