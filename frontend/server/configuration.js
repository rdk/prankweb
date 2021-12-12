// This configuration is used only in develop mode.
module.exports = {
  // Port used to run-develop instance.
  "port": 8075,
  // Use this to server data from files. Thus, you can develop
  // frontend without the need to run another component.
  "proxy-directory": "../../data/database/",
  // Use the option bellow to proxy commands to task runner instance.
  // This allows you to run tasks or connect to existing instance (p2rank.cz).
  // "proxy-service": "localhost:5000",
  "proxy-service": "localhost:8020",
};
