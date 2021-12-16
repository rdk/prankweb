export enum TaskStatus {
  queued = "queued",
  successful = "successful",
  failed = "failed",
}

export interface PredictionInfo {
  id: string;
  database: string;
  created: string;
  lastChange: string;
  status: string;
  metadata: {
    structureName: string;
    predictionName: string;
  }
}

export interface HttpWrap<T> {
  statusCode: number;
  content: T | null;
}

export async function fetchPrediction(
  database: string, id: string
): Promise<HttpWrap<PredictionInfo>> {
  // We need to navigate to the root, and then we can request the data.
  const url = getApiEndpoint(database, id);
  const response = await fetch(url);
  let result;
  try {
    result = await response.json();
  } catch {
    return {
      "statusCode": response.status,
      "content": null,
    };
  }
  return {
    "statusCode": response.status,
    "content": result as PredictionInfo,
  };
}

export function getApiEndpoint(database: string, code: string) {
  return `./api/v2/prediction/${database}/${code}`;
}

export async function fetchPredictionLog(
  database: string, id: string
): Promise<string> {
  const url = getApiEndpoint(database, id) + "/log";
  const response = await fetch(url);
  if (response.status !== 200) {
    throw new Error("Invalid response.");
  }
  return response.text();
}

export function getApiDownloadUrl({database, id}: PredictionInfo) {
  return `./api/v2/prediction/${database}/${id}`
    + "/public/visualizations.zip";
}
