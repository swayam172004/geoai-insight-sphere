# GeoAI Insight Sphere

AI land-cover classification and environmental indicators from Sentinel-2 satellite imagery.
Click any point on the map: the backend fetches a 650 m Sentinel-2 patch from Google Earth Engine,
a ResNet-18 model predicts the land-cover class, and NDVI / NDWI / NDBI, elevation, slope and
climate values are returned alongside it.

- **Frontend:** https://geoai-insight-sphere.vercel.app
- **Backend API:** FastAPI on Render (`GET /health`, `POST /api/analyze`, `POST /api/classify`)

> The free backend sleeps when idle, so the first request after a pause can take up to a minute.

## What is real and what is demo

| Part | Status |
| --- | --- |
| Map page: click analysis (land cover, NDVI/NDWI/NDBI, elevation, slope, climate) | Real, via Google Earth Engine |
| Map page: AI Land-Cover Prediction card | Real, ResNet-18 served as ONNX |
| Backend status badge | Real, calls `/health` |
| Predict, History, Statistics pages | **Demo data** (labelled in the UI) |
| Overlay and Earth Observation layers on the map | Placeholders ("Coming soon") |

## Model

**Task:** classify a 65 × 65 pixel (about 650 m) Sentinel-2 patch into 8 land-cover classes:
tree, shrub/grass, cropland, built-up, bare, snow/ice, water, wetland.

**Data pipeline** (`ml/`):
1. Labels come from ESA WorldCover v200 (2021), merged from 11 to 8 classes.
2. Points are sampled with Earth Engine `stratifiedSample`, the **same number per class** and
   **per world region** (8 regions), to avoid class imbalance. About 16,000 patches in total.
3. Each patch is cut from a cloud-filtered 2021 Sentinel-2 median composite (bands B4, B3, B2, B8)
   and exported as TFRecord files.
4. A ResNet-18 (ImageNet weights, first layer adapted to 4 bands) is trained with flips/rotations.
5. **The test set is whole regions the model never saw in training** (Oceania and the Middle East),
   so the accuracy reflects performance on new parts of the world.

**Results** (3,999 test patches from the held-out regions):

| Overall test accuracy | 74.9% |
| --- | --- |

| Class | Recall | Precision |
| --- | --- | --- |
| Tree | 0.58 | 0.85 |
| Shrub / grass | 0.64 | 0.46 |
| Cropland | 0.64 | 0.68 |
| Built-up | 0.94 | 0.82 |
| Bare | 0.78 | 0.61 |
| Snow / ice | 0.91 | 0.98 |
| Water | 0.99 | 0.99 |
| Wetland | 0.50 | 0.83 |

Shrub/grass acts as a catch-all class: the model often predicts it for tree, cropland, bare and wetland patches.
Going from 1,600 to 16,000 training patches improved accuracy only from about 73% to 75%, so the limit seems to be the
information in the input rather than the amount of data. Next steps: add shortwave-infrared bands (B11, B12) and
seasonal composites.

**Limitations**
- Labels are the WorldCover map, itself a machine-made product, so the model learns that map's habits.
- Predictions describe 2021 imagery (the same composite as the training data) and are made per 650 m patch, not per pixel.
- Predictions are most reliable for water, built-up and snow/ice, and least reliable for wetland, tree and shrub/grass.

## Architecture

```
Browser (React, TanStack Start, Leaflet)  --Vercel-->
        |  POST /api/analyze, POST /api/classify, GET /health
        v
FastAPI backend (Render)
   |-- Google Earth Engine: Sentinel-2, WorldCover, NASADEM, ERA5-Land
   `-- ONNX Runtime: backend/ml/landcover.onnx  (+ landcover_meta.json)
```

`landcover_meta.json` stores the band order, normalisation values and composite recipe, so the backend
builds inputs exactly the way the training data was built.

## Repository layout

```
src/        React frontend (routes, components, API client)
backend/    FastAPI app (routers, services, Earth Engine, ONNX classifier, model files in ml/)
ml/         Dataset export, training and ONNX export scripts
```

## Run locally

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Earth Engine needs a service account with access to your Earth Engine project:
export GEE_PROJECT_ID=your-project-id
export GOOGLE_APPLICATION_CREDENTIALS=./service-account.json   # never commit this file
uvicorn main:app --reload
```

**Frontend** (needs the backend URL)
```bash
echo "VITE_API_BASE_URL=http://localhost:8000" > .env
bun install        # or: npm install --legacy-peer-deps
bun run dev
```

## Deploy

- **Vercel (frontend):** import the repo, keep the root directory, set `VITE_API_BASE_URL` to the backend URL.
- **Render (backend):** root directory `backend`; build `pip install -r requirements.txt`;
  start `uvicorn main:app --host 0.0.0.0 --port $PORT`; health check `/health`.
  Environment: `PYTHON_VERSION`, `GEE_PROJECT_ID`, a secret file `service-account.json`
  (or `GEE_SERVICE_ACCOUNT_JSON`), and `CORS_ORIGINS` set to the Vercel URL.
- The Earth Engine service account needs the *Earth Engine Resource Viewer* and *Service Usage Consumer* roles.

## Reproduce the model

```bash
pip install -r ml/requirements.txt
python ml/02_export_patches.py     # starts Earth Engine export tasks (files appear in Google Drive)
# download the exported .tfrecord files into a folder named "patches", then:
python ml/03_prepare_dataset.py    # builds dataset.npz and prints the class balance
python ml/04_train.py              # trains and prints per-class results on held-out regions
python ml/05_export_onnx.py        # writes landcover.onnx + landcover_meta.json (copy into backend/ml/)
```

The scripts in `ml/` are set up for the **6-band** retraining (adds B11 and B12). The model currently deployed
was trained with the first four bands; to reproduce it, set `BANDS` to `["B4", "B3", "B2", "B8"]` in
`02_export_patches.py` and `03_prepare_dataset.py`.
