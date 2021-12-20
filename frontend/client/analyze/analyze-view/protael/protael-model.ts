export class ProtaelContent {

  sequence: string;

  ftracks: Array<{
    label: string,
    color: string,
    showLine: boolean,
    allowOverlap: boolean,
    features: Array<ProtaelFeature>
  }>

  overlayfeatures: {
    label: string,
    features: Array<ProtaelRegion>
  }

  qtracks: Array<{
    label: string,
    color: string,
    type: string,
    values: number[]
  }> = []

  constructor(
    sequence: string,
    pocketFeatures: ProtaelFeature[],
    chains: ProtaelRegion[],
    score: number[],
    scoreLabel: string,
    bindingSites: ProtaelFeature[]
  ) {
    this.sequence = sequence;
    this.ftracks = [{
      label: "Pockets",
      color: "blue",
      showLine: false,
      allowOverlap: false,
      features: pocketFeatures
    }]
    this.overlayfeatures = {label: "Chains", features: chains};
    if (bindingSites != null && bindingSites.length > 0) {
      this.ftracks.push({
        label: "Binding sites",
        color: "purple",
        showLine: false,
        allowOverlap: false,
        features: bindingSites
      });
    }
    if (score != null && score.length > 0) {
      this.qtracks = [{
        label: scoreLabel,
        color: "gray",
        type: "column",
        values: score
      }]
    }
  }

}

export class ProtaelRegion {

  label: string;

  start: number;

  end: number;

  color: string = "#DDD";

  regionType: string = "Chain"

  constructor(
    label: string,
    start: number,
    end: number,
    isOdd: boolean
  ) {
    this.label = label;
    this.start = start;
    this.end = end;
    if (!isOdd) {
      this.color = "#DDD";
    } else {
      this.color = "#B0B0B0";
    }
  }

}

export class ProtaelFeature {

  regionType: string;

  color: string;

  start: number;

  end: number;

  label: string;

  properties: any;

  constructor(
    regionType: string,
    color: string,
    start: number,
    end: number,
    label: string,
    properties: any
  ) {
    this.regionType = regionType;
    this.color = color;
    this.start = start;
    this.end = end;
    this.label = label;
    this.properties = properties;
  }

}
