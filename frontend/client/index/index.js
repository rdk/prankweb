import "../bootstrap.scss";
import "../background.css";
import "./index.css";

// TODO It is invalid to not provide any chains.

const INPUT_PDB = "input-pdb";

const INPUT_USER_FILE = "input-user-file";

const INPUT_UNIPROT = "input-uniprot";

let lastValidPdbCode = "";

let structureSealed = true;

let chainsLoaded = false;

(function initialize() {
  window.onInputChange = onInputChange;
  document.getElementById("pdb-code")
    .addEventListener("keyup", onChangePdbCode);
  document.getElementById("pdb-seal-structure")
    .addEventListener("change", onChangeSealStructure);
  document.getElementById("submit-button")
    .addEventListener("click", onSubmit);
  window.onload = onWindowLoaded;
})();

function onInputChange(inputType) {
  if (inputType === INPUT_PDB) {
    setElementDisplay("input-pdb-block", "block");
    setElementDisplay("input-user-file-block", "none");
    setElementDisplay("input-uniprot-block", "none");
    setElementDisplay("div-conservation", "block");
  } else if (inputType === INPUT_USER_FILE) {
    setElementDisplay("input-pdb-block", "none");
    setElementDisplay("input-user-file-block", "block");
    setElementDisplay("input-uniprot-block", "none");
    setElementDisplay("div-conservation", "block");
  } else { // INPUT_UNIPROT
    setElementDisplay("input-pdb-block", "none");
    setElementDisplay("input-user-file-block", "none");
    setElementDisplay("input-uniprot-block", "block");
    setElementDisplay("div-conservation", "none");
  }
}

async function onChangePdbCode() {
  const code = this.value;
  if (lastValidPdbCode === code) {
    // Data are already loaded.
    return;
  }
  lastValidPdbCode = code;
  await updateChainsForPdbCode(code);
}

async function updateChainsForPdbCode(code) {
  if (!isValidPdbId(code)) {
    setElementDisplay("pdb-chains-block", "none");
    return;
  }
  if (!structureSealed) {
    // Update visibility only of the structure is not sealed.
    setElementDisplay("pdb-chains-block", "block");
  }
  setElementDisplay("pdb-chains-holder", "none");
  setElementDisplay("pdb-chains-loading", "block");
  chainsLoaded = false;
  const chains = await fetchChainsForPdb(code);
  if (code !== lastValidPdbCode) {
    // User changed input before we loaded the data.
    return;
  }
  // Update visibility.
  let html = "";
  if (chains === null) {
    html = `Can't load chains.`;
  } else {
    chains.forEach(chain => html += createHtmlCheckbox(chain));
  }
  chainsLoaded = true;
  document.getElementById("pdb-chains-holder").innerHTML = html;
  setElementDisplay("pdb-chains-holder", "block");
  setElementDisplay("pdb-chains-loading", "none");
}

function setElementDisplay(id, value) {
  document.getElementById(id).style.display = value;
}

function isValidPdbId(value) {
  return value.length === 4 && /^[a-zA-Z0-9]*$/.test(value);
}

async function fetchChainsForPdb(code) {
  const url = "https://www.ebi.ac.uk/pdbe/api/pdb/entry/molecules/" + code;
  const response = await fetch(url);
  if (response.status !== 200) {
    return null;
  }
  const content = await response.json();
  const chains = [];
  content[code.toLowerCase()].forEach((entity) => {
    if (!entity["sequence"]) {
      return;
    }
    entity["in_chains"].forEach(function (chain) {
      chains.push(chain);
    });
  });
  return chains;
}

function createHtmlCheckbox(chain) {
  const id = "pdb-chain-" + chain;
  return `
      <input
        class="form-check-input" 
        type="checkbox"
        checked="checked"
        name="pdb-chain-value"
        value="${chain}"
        id="${id}"
        >
      <label class="form-check-label" for="${id}">
        ${chain}
      </label>
    `;
}

function onChangeSealStructure(event) {
  structureSealed = event.target.checked;
  if (structureSealed) {
    setElementDisplay("pdb-chains-block", "none");
  } else {
    if (chainsLoaded) {
      setElementDisplay("pdb-chains-block", "block");
    }
  }
}

function onSubmit(event) {
  event.preventDefault();
  const formData = collectFormData();
  if (formData.type === INPUT_PDB) {
    submitInputPdb(formData);
  } else if (formData.type === INPUT_USER_FILE) {
    submitInputUserFile(formData);
  } else if (formData.type === INPUT_UNIPROT) {
    submitUniprot(formData);
  } else {
    alert(`Invalid user input type: '${formData.type}'`);
  }
}

// TODO Split into collect for each tab.
function collectFormData() {
  const form = document.forms["input-form"];
  return {
    "type": form["input-type"].value,
    "pdbCode": form["pdb-code"].value,
    "pdbCodeChains": collectFromPdbCodeChains(form),
    "userFile": form["user-file"].files[0],
    "userFileChains": collectFormUserFileChains(form),
    "conservation": form["use-conservation"].checked,
    "uniprot": form["uniprot-code"].value,
    "sealed": structureSealed,
  }
}

function collectFromPdbCodeChains(form) {
  const result = [];
  for (const element of form) {
    if (element.name !== "pdb-chain-value") {
      continue;
    }
    if (!element.checked) {
      continue;
    }
    result.push(element.value);
  }

  return result;
}

function collectFormUserFileChains(form) {
  const value = form["user-file-chains"].value;
  return value.split(",")
    // Remove leading white spaces.
    .map(value => value.replace(/^\s+/, ""))
    .filter(value => value.length > 0)
    // Use just the first character.
    .map(value => value.substring(0, 2).toUpperCase());
}

function submitInputPdb(formData) {
  const pdbCode = formData.pdbCode.toUpperCase();
  let url;
  if (formData.conservation) {
    url = createUrl(
      "v3-conservation-hmm",
      pdbCode,
      formData.sealed ? [] : formData.pdbCodeChains);
  } else {
    url = createUrl(
      "v3",
      pdbCode,
      formData.sealed ? [] : formData.pdbCodeChains);
  }
  window.location.href = url;
}

function createUrl(database, pdb, chains) {
  let result = "./analyze?database=" + database + "&code=" + pdb;
  if (chains.length > 0) {
    result += "_" + chains.join(",");
  }
  return result;
}

function submitInputUserFile(formData) {
  const requestData = new FormData();
  requestData.append(
    "structure",
    formData.userFile,
    formData.userFile.name);
  requestData.append(
    "configuration",
    asJsonBlob({
      "chains": formData.userFileChains,
      "structure-sealed": formData.userFileChains.length === 0,
      "compute-conservation": formData.conservation
    }),
    "configuration.json");
  sendPostRequest("./api/v2/prediction/v3-user-upload", requestData);
}

function asJsonBlob(content) {
  return new Blob([JSON.stringify(content)], {"type": "text/json"});
}

function sendPostRequest(url, data) {
  fetch(url, {
    "method": "post",
    "body": data,
  }).then(function (response) {
    window.location.href = response.headers.get("location");
  });
}

function submitUniprot(formData) {
  const uniprot = formData.uniprot.toLowerCase();
  window.location.href = createUrl("v3-alphafold", uniprot, []);
}

/**
 * When user fills in the form click submit and then back, some form
 * elements are pre-filled. We need to react to that by loading any
 * data necessary.
 */
function onWindowLoaded() {
  console.log("onWindowLoaded", document.forms["input-form"]["pdb-code"].value);
  // TODO Update based on the latest data ...
}
