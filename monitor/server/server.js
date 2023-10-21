const express = require("express");
const logger = require("./logging");

(function main() {
  const app = express();
  initializeApi(app);
  start(app);
})();

async function initializeApi(app) {
  const ga = process.env.GOOGLE_ANALYTICS;
  if (ga === undefined) {
    logger.info("No Google Analytics account provided.");
  } else {
    app.use("/api/v1/view", createOnView(ga));
  }
}

function createOnView(ga) {
  return async (req, res) => {
    const url = "https://www.google-analytics.com/collect?" +
      `v=1&t=event&tid=${ga}&cid=0&ec=pdbe-kb&ea=view`;

    const options = {
      method: "GET",
      headers: {
        "User-Agent": "request",
      },
    };

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        logger.error("Can't report view.");
      }
    } catch (error) {
      logger.error("Error while reporting view:", error);
    }

    // Do not wait for our request to finish.
    res.sendStatus(200);
  };
}

function start(app) {
  const port = 8021;
  app.listen(port, function onStart(error) {
    if (error) {
      logger.error("Can't start server.", { "error": error });
    }
    logger.info("Server has been started.", { "port": port });
  });
}
