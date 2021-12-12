export class ProtaelContent {

  sequence: string;

  ftracks: Array<{ label: string, color: string, showLine: boolean, allowOverlap: boolean, features: Array<ProtaelFeature> }>

  overlayfeatures: { label: string, features: Array<ProtaelRegion> }

  qtracks: Array<{ label: string, color: string, type: string, values: number[] }> = []

  constructor(
    seq: string,
    pocketFeatures: ProtaelFeature[],
    chains: ProtaelRegion[],
    conservationScores: number[],
    bindingSites: ProtaelFeature[]
  ) {
    this.sequence = seq;
    this.ftracks = [{
      label: "Pockets",
      color: "blue",
      showLine: false,
      allowOverlap: false,
      features: pocketFeatures
    }]
    this.overlayfeatures = {label: "Chains", features: chains};
    if (conservationScores != null && conservationScores.length > 0) {
      this.qtracks = [{
        label: "Evolutionary conservation",
        color: "gray",
        type: "column",
        values: conservationScores
      }]
    }
    if (bindingSites != null && bindingSites.length > 0) {
      this.ftracks.push({
        label: "Binding sites",
        color: "purple",
        showLine: false,
        allowOverlap: false,
        features: bindingSites
      });
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
