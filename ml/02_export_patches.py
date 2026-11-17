"""
Step 2 (v4, full run): export balanced Sentinel-2 patches with 6 bands.

 * 6 bands: red, green, blue, near-infrared + two shortwave-infrared (B11, B12)
 * 250 points per class per region (16,000 patches in total)
 * the work is split into small tasks (8 regions x 5 chunks = 40 tasks) so that no
   single task times out. Tasks run in the background; they queue up and finish over
   a few hours. Files appear in Google Drive only when a task shows Completed.

Set QUICK_TEST = True for a 30-minute sanity run first (8 tasks, 1,600 patches).
"""
import ee

ee.Initialize(project="ee-swayamsikharwar")

# ---------------- settings ----------------
QUICK_TEST = False
POINTS_PER_CLASS = 25 if QUICK_TEST else 250     # per class, per region
CHUNKS = 1 if QUICK_TEST else 5                   # tasks per region
SAMPLE_SCALE = 100                                # metres; coarse sampling avoids timeouts
PATCH = 65                                        # odd size: labelled pixel is the centre
BANDS = ["B4", "B3", "B2", "B8", "B11", "B12"]    # R, G, B first (pretrained weights), then NIR, SWIR1, SWIR2
DRIVE_FOLDER = "geoai_landcover_patches_v2"       # new folder: do not mix with the 4-band files
SEED = 42

REGIONS = {
    "north_america": ee.Geometry.Rectangle([-168, 15, -52, 70]),
    "south_america": ee.Geometry.Rectangle([-82, -55, -34, 12]),
    "europe":        ee.Geometry.Rectangle([-10, 36, 40, 70]),
    "africa":        ee.Geometry.Rectangle([-18, -35, 52, 36]),
    "middle_east":   ee.Geometry.Rectangle([34, 12, 62, 42]),
    "south_asia":    ee.Geometry.Rectangle([62, 5, 98, 36]),
    "east_asia":     ee.Geometry.Rectangle([98, 18, 146, 54]),
    "oceania":       ee.Geometry.Rectangle([110, -48, 180, -10]),
}

# ---------------- labels: WorldCover codes -> 8 classes ----------------
from_codes = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95]
to_classes = [0,  1,  1,  2,  3,  4,  5,  6,  7,  7]
worldcover = ee.Image("ESA/WorldCover/v200/2021")
label = (worldcover.remap(from_codes, to_classes, defaultValue=-1)
         .rename("label").toInt())
label = label.updateMask(label.gte(0))

# ---------------- imagery: cloud-free yearly composite ----------------
s2 = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
      .filterDate("2021-01-01", "2022-01-01")
      .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
      .select(BANDS)
      .median()
      .divide(10000))                                   # reflectance 0..1

kernel = ee.Kernel.square(radius=PATCH // 2, units="pixels")   # radius 32 -> 65 x 65
patch_image = s2.neighborhoodToArray(kernel)

# ---------------- one task per (region, chunk) ----------------
per_chunk = POINTS_PER_CLASS // CHUNKS
started = 0
for name, geom in REGIONS.items():
    for chunk in range(CHUNKS):
        points = label.stratifiedSample(
            numPoints=0,
            classBand="label",
            region=geom,
            scale=SAMPLE_SCALE,
            classValues=list(range(8)),
            classPoints=[per_chunk] * 8,
            seed=SEED + chunk,                         # different random points per chunk
            geometries=True,
            tileScale=16,
        ).map(lambda f, n=name: f.set("region", n))

        samples = patch_image.sampleRegions(
            collection=points,
            properties=["label", "region"],
            scale=10,
            tileScale=16,
        )

        ee.batch.Export.table.toDrive(
            collection=samples,
            description=f"patches_{name}_{chunk}",
            folder=DRIVE_FOLDER,
            fileNamePrefix=f"patches_{name}_{chunk}",
            fileFormat="TFRecord",
        ).start()
        started += 1
        print(f"Started {name} chunk {chunk + 1}/{CHUNKS}")

print(f"\n{started} tasks started ({started * per_chunk * 8} patches expected).")
print("Watch them at https://code.earthengine.google.com/tasks")
print(f"Files appear in Google Drive > {DRIVE_FOLDER} only when a task shows Completed.")
