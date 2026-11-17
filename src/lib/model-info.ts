// Real numbers from the trained land-cover model (see README.md).
// Update this file when the model is retrained (for example the 6-band version).
export const MODEL_INFO = {
  architecture: "ResNet-18",
  inputBands: ["Red", "Green", "Blue", "Near-infrared"],
  patchPixels: 65,
  imagery: "Sentinel-2, 2021 composite",
  trainingPatches: 15987,
  classes: 8,
  regions: 8,
  testAccuracy: 74.9, // percent, on regions never seen in training
  heldOutRegions: "Oceania and the Middle East",
  // Recall per class on the held-out regions (fraction of true patches the model found).
  perClass: [
    { name: "Water", recall: 0.99 },
    { name: "Built-up", recall: 0.94 },
    { name: "Snow / ice", recall: 0.91 },
    { name: "Bare", recall: 0.78 },
    { name: "Shrub / grass", recall: 0.64 },
    { name: "Cropland", recall: 0.64 },
    { name: "Tree", recall: 0.58 },
    { name: "Wetland", recall: 0.5 },
  ],
} as const;
