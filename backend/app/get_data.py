import ee
import json
import sys
import datetime
import math
from shapely.geometry import shape
import geopandas as gpd

# Initialize Earth Engine
try:
    ee.Initialize(project='projectproject-471216')
except Exception as e:
    raise RuntimeError("ee.Initialize() failed. Run `earthengine authenticate` then try again.") from e

# ---------- CONFIG ----------
DEFAULT_BBOX = [72.5, 22.9, 72.65, 23.05]  # Ahmedabad default bbox

START_DATE = "2022-01-01"
END_DATE = "2022-12-31"

NDVI_GREEN_THRESH = 0.3

# Dataset IDs
GPW_POP_DENSITY = "CIESIN/GPWv411/GPW_Population_Density"
SENTINEL2 = "COPERNICUS/S2_SR_HARMONIZED"
MODIS_LST = "MODIS/061/MOD11A2"
MAIAC_AOD = "MODIS/061/MCD19A2_GRANULES"
SRTM = "USGS/SRTMGL1_003"
GPM_IMERG = "NASA/GPM_L3/IMERG_V07"
WORLD_COVER = "ESA/WorldCover/v100"
JRC_GSW = "JRC/GSW1_4/GlobalSurfaceWater"

MAX_PIXELS = 1e13


# ---------- HELPERS ----------
# def read_geojson_to_eegeom(geojson_path=None):
#     """Return an ee.Geometry from GeoJSON file path, or default bbox if None."""
#     if geojson_path:
#         gdf = gpd.read_file(geojson_path)
#         geom = gdf.unary_union
#         geojson = json.loads(gpd.GeoSeries([geom]).to_json())['features'][0]['geometry']
#         ee_geom = ee.Geometry(geojson)
#         return ee_geom, geojson
#     else:
#         minLon, minLat, maxLon, maxLat = DEFAULT_BBOX
#         ee_geom = ee.Geometry.Rectangle([minLon, minLat, maxLon, maxLat])
#         geojson = ee_geom.getInfo()
#         return ee_geom, geojson

def read_geojson_to_eegeom(geojson_path=None):
    """Return an ee.Geometry from GeoJSON file path, or default bbox if None."""
    if geojson_path:
        try:
            print(f"Reading GeoJSON file: {geojson_path}")
            gdf = gpd.read_file(geojson_path)

            if gdf.empty:
                print("⚠️ GeoJSON is empty! Using default bbox instead.")
                raise ValueError("Empty GeoJSON")

            geom = gdf.unary_union
            geojson = json.loads(gpd.GeoSeries([geom]).to_json())['features'][0]['geometry']

            ee_geom = ee.Geometry(geojson)

            # ✅ Print coordinates for verification
            bounds = ee_geom.bounds().getInfo()
            print(f"✅ Using AOI bounds: {bounds}")

            return ee_geom, geojson

        except Exception as e:
            print("⚠️ Failed to read GeoJSON file:", e)
            print("➡️ Falling back to default bbox (Ahmedabad).")

    # ---------- Fallback ----------
    minLon, minLat, maxLon, maxLat = DEFAULT_BBOX
    ee_geom = ee.Geometry.Rectangle([minLon, minLat, maxLon, maxLat])
    geojson = ee_geom.getInfo()
    print(f"✅ Using default bbox: {geojson['coordinates']}")
    return ee_geom, geojson

def safe_getinfo(obj):
    try:
        return obj.getInfo()
    except Exception as e:
        print("Warning: getInfo() failed:", e)
        return None


def reduce_mean(image, geometry, scale):
    rr = image.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=geometry,
        scale=scale,
        maxPixels=MAX_PIXELS
    )
    return safe_getinfo(rr)


def reduce_sum(image, geometry, scale):
    rr = image.reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=geometry,
        scale=scale,
        maxPixels=MAX_PIXELS
    )
    return safe_getinfo(rr)


# # ---------- LAYER FUNCTIONS ----------
# def get_population_density_sedac(aoi, year=2020):
#     """Fetch mean population density for AOI using SEDAC GPWv4.11."""
#     try:
#         # ✅ Fixed: Each year is a separate image
#         img = ee.Image(f"CIESIN/GPWv411/GPW_Population_Density/{year}")
#         img_band = img.select('population_density')

#         stats = img_band.reduceRegion(
#             reducer=ee.Reducer.mean(),
#             geometry=aoi,
#             scale=1000,
#             maxPixels=1e13
#         )

#         stats_i = stats.getInfo()
#         pop_val = list(stats_i.values())[0] if stats_i else None

#         return {
#             'population_density_mean_per_km2': pop_val,
#             'gpw_year': year
#         }

#     except Exception as e:
#         print("Population density fetch error:", e)
#         return {
#             'population_density_mean_per_km2': None,
#             'gpw_year': year
#         }


def get_population_density_worldpop(aoi, year=2020):
    """Fetch mean population density using WorldPop."""
    try:
        img = ee.ImageCollection("WorldPop/GP/100m/pop") \
            .filterDate(f"{year}-01-01", f"{year}-12-31") \
            .mean()  # Take average of year
        
        stats = img.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=aoi,
            scale=100,
            maxPixels=1e13
        )
        stats_i = stats.getInfo()
        pop_val = list(stats_i.values())[0] if stats_i else None

        return {
            'population_density_mean_per_km2': pop_val,
            'source': 'WorldPop/GP/100m/pop',
            'year': year
        }

    except Exception as e:
        print("Population density fetch error:", e)
        return {
            'population_density_mean_per_km2': None,
            'source': 'WorldPop/GP/100m/pop',
            'year': year
        }


def get_ndvi_stats(aoi, start_date, end_date):
    s2 = ee.ImageCollection(SENTINEL2) \
        .filterDate(start_date, end_date) \
        .filterBounds(aoi) \
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 40)) \
        .select(['B8', 'B4'])

    def ndvi_fn(img):
        return img.normalizedDifference(['B8', 'B4']).rename('NDVI')

    ndvi_col = s2.map(ndvi_fn)
    ndvi_med = ndvi_col.median().select('NDVI')
    ndvi_mean = reduce_mean(ndvi_med, aoi, scale=10)

    mask = ndvi_med.gt(NDVI_GREEN_THRESH)
    mask_sum = mask.reduceRegion(ee.Reducer.sum(), aoi, scale=10, maxPixels=MAX_PIXELS)
    count = ndvi_med.reduceRegion(ee.Reducer.count(), aoi, scale=10, maxPixels=MAX_PIXELS)

    mask_sum_i = safe_getinfo(mask_sum)
    count_i = safe_getinfo(count)
    pct_green = None
    if mask_sum_i and count_i:
        try:
            s = list(mask_sum_i.values())[0]
            t = list(count_i.values())[0]
            pct_green = (s / t) if (t and t != 0) else None
        except Exception:
            pct_green = None
    ndvi_val = list(ndvi_mean.values())[0] if ndvi_mean else None
    return {'ndvi_mean': ndvi_val, 'pct_green': pct_green}


def get_lst_stats(aoi, start_date, end_date):
    col = ee.ImageCollection(MODIS_LST).filterDate(start_date, end_date).filterBounds(aoi)
    img = col.select('LST_Day_1km').mean()
    stats = reduce_mean(img, aoi, scale=1000)
    raw_mean = list(stats.values())[0] if stats else None
    lst_c = None
    if raw_mean is not None:
        lst_c = (raw_mean * 0.02) - 273.15
    return {'lst_mean_celsius_est': lst_c, 'lst_raw_mean': raw_mean}


def get_aod_stats(aoi, start_date, end_date):
    col = ee.ImageCollection(MAIAC_AOD).filterDate(start_date, end_date).filterBounds(aoi)
    first = col.first()
    band_names = []
    try:
        band_names = first.bandNames().getInfo()
    except Exception:
        band_names = []
    chosen = None
    for b in ['Optical_Depth_047', 'Optical_Depth_055', 'AOD_047', 'AOD_550']:
        if b in band_names:
            chosen = b
            break
    if not chosen and band_names:
        chosen = band_names[0]
    if not chosen:
        return {'aod_mean': None, 'aod_band_used': None}
    mean_img = col.select(chosen).mean()
    stats = reduce_mean(mean_img, aoi, scale=1000)
    mean_val = list(stats.values())[0] if stats else None
    return {'aod_mean': mean_val, 'aod_band_used': chosen}


def get_elevation_stats(aoi):
    dem = ee.Image(SRTM)
    stats = reduce_mean(dem, aoi, scale=30)
    elev = list(stats.values())[0] if stats else None
    return {'elevation_mean_m': elev}


def get_precipitation_total(aoi, start_date, end_date):
    col = ee.ImageCollection(GPM_IMERG).filterDate(start_date, end_date).filterBounds(aoi)
    first = col.first()
    band_names = []
    try:
        band_names = first.bandNames().getInfo()
    except Exception:
        band_names = []
    chosen = None
    for b in ['precipitationCal', 'precipitation', 'precipitationCal_1km']:
        if b in band_names:
            chosen = b
            break
    if not chosen and band_names:
        chosen = band_names[0]
    if not chosen:
        return {'precip_total': None, 'precip_band_used': None}
    precip_sum = col.select(chosen).sum()
    stats = reduce_mean(precip_sum, aoi, scale=1000)
    val = list(stats.values())[0] if stats else None
    return {'precip_total_mean_mm': val, 'precip_band_used': chosen}


def get_landcover_stats(aoi):
    wc_image = ee.ImageCollection(WORLD_COVER).first().select('Map')
    hist = wc_image.reduceRegion(
        ee.Reducer.frequencyHistogram(),
        aoi,
        scale=10,
        maxPixels=MAX_PIXELS
    )
    hist_i = safe_getinfo(hist)
    dominant = None
    if hist_i:
        try:
            d = list(hist_i.values())[0]
            items = [(int(k), int(v)) for k, v in d.items()]
            items.sort(key=lambda x: x[1], reverse=True)
            dominant = items[0][0] if items else None
        except Exception:
            dominant = None
    return {'landcover_dominant_class': dominant}


def get_water_proximity_and_floodscore(aoi, start_date, end_date):
    occ = ee.Image(JRC_GSW).select('occurrence')
    persistent = occ.gte(50)
    distance = persistent.Not().fastDistanceTransform(30).sqrt()
    occ_mean = reduce_mean(occ, aoi, scale=30)
    occ_val = list(occ_mean.values())[0] if occ_mean else None

    elev = get_elevation_stats(aoi)['elevation_mean_m']
    precip = get_precipitation_total(aoi, start_date, end_date)['precip_total_mean_mm']

    elev_norm = max(0.0, min(1.0, 1.0 - (elev / 200.0))) if elev is not None else None
    precip_norm = max(0.0, min(1.0, precip / 2000.0)) if precip is not None else None
    occ_norm = max(0.0, min(1.0, occ_val / 100.0)) if occ_val is not None else None

    components, weights = [], []
    if elev_norm is not None:
        components.append(elev_norm); weights.append(0.4)
    if precip_norm is not None:
        components.append(precip_norm); weights.append(0.4)
    if occ_norm is not None:
        components.append(occ_norm); weights.append(0.2)

    flood_score = sum([c*w for c, w in zip(components, weights)]) / sum(weights) if components else None
    return {'water_occurrence_mean': occ_val, 'flood_risk_score': flood_score}


# ---------- SUITABILITY HEURISTICS ----------
def compute_suitabilities(profile):
    def g(k):
        return profile.get(k)

    pop = g('population_density_mean_per_km2') or 0
    ndvi = g('ndvi_mean') or 0.0
    pct_green = g('pct_green') or 0.0
    lst = g('lst_mean_celsius_est') or 0.0
    aod = g('aod_mean') or 0.0
    flood = g('flood_risk_score') or 0.0

    pop_norm = max(0.0, min(1.0, pop / 10000.0))
    ndvi_norm = max(0.0, min(1.0, (ndvi + 0.2) / 0.8))
    lst_norm = max(0.0, min(1.0, (lst - 20.0) / 25.0))
    aod_norm = max(0.0, min(1.0, aod / 1.0))
    flood_norm = max(0.0, min(1.0, flood))

    greenspace_priority = (0.5 * pop_norm) + (0.3 * (1 - ndvi_norm)) + (0.2 * lst_norm)
    greenspace_priority = max(0.0, min(1.0, greenspace_priority))

    industry_score = (0.5 * (1 - pop_norm)) + (0.4 * (1 - flood_norm)) + (0.1 * (1 - aod_norm))
    industry_score = max(0.0, min(1.0, industry_score))

    res_score = (0.4 * (1 - flood_norm)) + (0.3 * (1 - aod_norm)) + (0.3 * pct_green)
    res_score = max(0.0, min(1.0, res_score))

    return {
        'greenspace_priority': greenspace_priority,
        'industrial_suitability': industry_score,
        'residential_suitability': res_score,
        'best_use': (
            'greenspace' if greenspace_priority >= max(industry_score, res_score)
            else ('residential' if res_score >= industry_score else 'industrial')
        )
    }


# ---------- MAIN ----------
def build_profile(aoi_ee, geojson_geom, start_date=START_DATE, end_date=END_DATE):
    profile = {}
    profile['generated_at'] = datetime.datetime.now(datetime.UTC).isoformat()
    profile['analysis_window'] = {'start': start_date, 'end': end_date}
    profile['geometry'] = geojson_geom

    print("Collecting population density...")
    # profile.update(get_population_density_sedac(aoi_ee, year=2020))
    profile.update(get_population_density_worldpop(aoi_ee, year=2020))


    print("Collecting NDVI stats (Sentinel-2 median)...")
    profile.update(get_ndvi_stats(aoi_ee, start_date, end_date))

    print("Collecting LST stats (MODIS)...")
    profile.update(get_lst_stats(aoi_ee, start_date, end_date))

    print("Collecting AOD stats (MAIAC)...")
    profile.update(get_aod_stats(aoi_ee, start_date, end_date))

    print("Collecting elevation (SRTM)...")
    profile.update(get_elevation_stats(aoi_ee))

    print("Collecting precipitation (GPM IMERG)...")
    profile.update(get_precipitation_total(aoi_ee, start_date, end_date))

    print("Collecting landcover (ESA WorldCover)...")
    profile.update(get_landcover_stats(aoi_ee))

    print("Collecting water occurrence & flood proxy...")
    profile.update(get_water_proximity_and_floodscore(aoi_ee, start_date, end_date))

    print("Computing suitabilities...")
    profile['suitability'] = compute_suitabilities(profile)

    return profile


if __name__ == "__main__":
    # Use aoi.geojson by default, but allow command line override
    geojson_path = sys.argv[1] if len(sys.argv) > 1 else "aoi.geojson"
    print("Using GeoJSON:", geojson_path)

    aoi_ee, geojson_geom = read_geojson_to_eegeom(geojson_path)
    result = build_profile(aoi_ee, geojson_geom, start_date=START_DATE, end_date=END_DATE)

    out_file = "aoi_profile.json"
    with open(out_file, "w") as f:
        json.dump(result, f, indent=2)
    print(f"Saved AOI profile to {out_file}")

    print("SUMMARY:")
    print(" Population density (mean):", result.get('population_density_mean_per_km2'))
    print(" NDVI mean:", result.get('ndvi_mean'), "Pct green:", result.get('pct_green'))
    print(" LST (C):", result.get('lst_mean_celsius_est'))
    print(" AOD (mean):", result.get('aod_mean'))
    print(" Elevation (m mean):", result.get('elevation_mean_m'))
    print(" Precip total (mm mean):", result.get('precip_total_mean_mm'))
    print(" Flood risk score (0..1):", result.get('flood_risk_score'))
    print(" Suitability:", result.get('suitability'))

# #!/usr/bin/env python3
# """
# gather_aoi_data.py

# Usage:
#     python gather_aoi_data.py [path_to_geojson]

# This script:
#  - Loads an AOI from a GeoJSON file (or uses a default bbox).
#  - Uses the Google Earth Engine Python API to collect:
#     - Population density (CIESIN GPWv4.11)
#     - NDVI (Sentinel-2 median)
#     - Land Surface Temperature (MODIS MOD11A2 -> Celsius)
#     - MAIAC AOD (MCD19A2_GRANULES)
#     - Elevation (SRTM)
#     - Precipitation total (GPM IMERG)
#     - Land cover (ESA WorldCover v100)
#     - Water occurrence (JRC GlobalSurfaceWater) -> used for flood proximity
#  - Computes summary stats and simple suitability heuristics
#  - Saves results to 'aoi_profile.json'
# Notes:
#  - Make sure you've run `earthengine authenticate` and have ee.Initialize() access.
#  - For very large AOIs you may want to export images instead of using reduceRegion/getInfo.
# """

# import ee
# import json
# import sys
# import datetime
# import math
# from shapely.geometry import shape
# import geopandas as gpd

# # Initialize Earth Engine
# try:
#     ee.Initialize(project='projectproject-471216')
# except Exception as e:
#     raise RuntimeError("ee.Initialize() failed. Run `earthengine authenticate` then try again.") from e

# # ---------- CONFIG ----------
# # Default bbox as fallback: Ahmedabad small bbox (minLon, minLat, maxLon, maxLat)
# DEFAULT_BBOX = [72.5, 22.9, 72.65, 23.05]

# # Time window for time-aware layers
# START_DATE = "2022-01-01"
# END_DATE   = "2022-12-31"

# # NDVI threshold to consider "green"
# NDVI_GREEN_THRESH = 0.3

# # Dataset IDs (Earth Engine)
# GPW_POP_DENSITY = "CIESIN/GPWv411/GPW_Population_Count"
# SENTINEL2 = "COPERNICUS/S2_SR_HARMONIZED"
# MODIS_LST = "MODIS/061/MOD11A2"
# MAIAC_AOD = "MODIS/061/MCD19A2_GRANULES"
# SRTM = "USGS/SRTMGL1_003"
# GPM_IMERG = "NASA/GPM_L3/IMERG_V07"
# WORLD_COVER = "ESA/WorldCover/v100"
# JRC_GSW = "JRC/GSW1_4/GlobalSurfaceWater"

# # Reduction parameters
# MAX_PIXELS = 1e13

# # ---------- HELPERS ----------
# def read_geojson_to_eegeom(geojson_path=None):
#     """Return an ee.Geometry from GeoJSON file path, or default bbox if None."""
#     if geojson_path:
#         gdf = gpd.read_file(geojson_path)
#         # unify into single geometry (dissolve)
#         geom = gdf.unary_union
#         geojson = json.loads(gpd.GeoSeries([geom]).to_json())['features'][0]['geometry']
#         ee_geom = ee.Geometry(geojson)
#         return ee_geom, geojson
#     else:
#         minLon, minLat, maxLon, maxLat = DEFAULT_BBOX
#         ee_geom = ee.Geometry.Rectangle([minLon, minLat, maxLon, maxLat])
#         geojson = ee_geom.getInfo()
#         return ee_geom, geojson

# def safe_getinfo(obj):
#     try:
#         return obj.getInfo()
#     except Exception as e:
#         print("Warning: getInfo() failed:", e)
#         return None

# def reduce_mean(image, geometry, scale):
#     """Return mean value dictionary for image over geometry"""
#     rr = image.reduceRegion(
#         reducer=ee.Reducer.mean(),
#         geometry=geometry,
#         scale=scale,
#         maxPixels=MAX_PIXELS
#     )
#     return safe_getinfo(rr)

# def reduce_sum(image, geometry, scale):
#     rr = image.reduceRegion(
#         reducer=ee.Reducer.sum(),
#         geometry=geometry,
#         scale=scale,
#         maxPixels=MAX_PIXELS
#     )
#     return safe_getinfo(rr)

# # ---------- LAYER FUNCTIONS ----------
# def get_population_density_sedac(aoi, year=2020):
#     """
#     Fetch mean population density for the AOI using SEDAC GPWv4.11.
#     Returns density in people per km².
#     """
#     try:
#         img = ee.Image("CIESIN/GPWv411/GPW_Population_Density")
#         # GPWv4.11 has bands for different years: 'pd_2020', 'pd_2015', etc.
#         band_name = f'pd_{year}'
#         img_band = img.select(band_name)

#         stats = img_band.reduceRegion(
#             reducer=ee.Reducer.mean(),
#             geometry=aoi,
#             scale=1000,  # GPW is ~1km resolution
#             maxPixels=1e13
#         )

#         stats_i = stats.getInfo()
#         pop_val = list(stats_i.values())[0] if stats_i else None

#         return {
#             'population_density_mean_per_km2': pop_val,
#             'gpw_year': year
#         }

#     except Exception as e:
#         print("Population density fetch error:", e)
#         return {
#             'population_density_mean_per_km2': None,
#             'gpw_year': year
#         }






# def get_ndvi_stats(aoi, start_date, end_date):
#     s2 = ee.ImageCollection(SENTINEL2) \
#           .filterDate(start_date, end_date) \
#           .filterBounds(aoi) \
#           .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 40)) \
#           .select(['B8', 'B4'])

#     def ndvi_fn(img):
#         return img.normalizedDifference(['B8', 'B4']).rename('NDVI')
#     ndvi_col = s2.map(ndvi_fn)
#     ndvi_med = ndvi_col.median().select('NDVI')
#     ndvi_mean = reduce_mean(ndvi_med, aoi, scale=10)
#     # Percent green: compute ratio of pixels with NDVI > threshold
#     mask = ndvi_med.gt(NDVI_GREEN_THRESH)
#     # sum of mask (true=1) and count of pixels
#     mask_sum = mask.reduceRegion(ee.Reducer.sum(), aoi, scale=10, maxPixels=MAX_PIXELS)
#     count = ndvi_med.reduceRegion(ee.Reducer.count(), aoi, scale=10, maxPixels=MAX_PIXELS)
#     mask_sum_i = safe_getinfo(mask_sum)
#     count_i = safe_getinfo(count)
#     pct_green = None
#     if mask_sum_i and count_i:
#         try:
#             s = list(mask_sum_i.values())[0]
#             t = list(count_i.values())[0]
#             pct_green = (s / t) if (t and t != 0) else None
#         except Exception:
#             pct_green = None
#     ndvi_val = list(ndvi_mean.values())[0] if ndvi_mean else None
#     return {'ndvi_mean': ndvi_val, 'pct_green': pct_green}

# def get_lst_stats(aoi, start_date, end_date):
#     col = ee.ImageCollection(MODIS_LST).filterDate(start_date, end_date).filterBounds(aoi)
#     # Use LST_Day_1km
#     img = col.select('LST_Day_1km').mean()
#     stats = reduce_mean(img, aoi, scale=1000)
#     raw_mean = list(stats.values())[0] if stats else None
#     lst_c = None
#     if raw_mean is not None:
#         # Apply MODIS LST typical scale factor 0.02 and convert Kelvin to Celsius
#         lst_c = (raw_mean * 0.02) - 273.15
#     return {'lst_mean_celsius_est': lst_c, 'lst_raw_mean': raw_mean}

# def get_aod_stats(aoi, start_date, end_date):
#     col = ee.ImageCollection(MAIAC_AOD).filterDate(start_date, end_date).filterBounds(aoi)
#     first = col.first()
#     band_names = []
#     try:
#         band_names = first.bandNames().getInfo()
#     except Exception:
#         band_names = []
#     chosen = None
#     for b in ['Optical_Depth_047', 'Optical_Depth_055', 'AOD_047', 'AOD_550']:
#         if b in band_names:
#             chosen = b
#             break
#     if not chosen and band_names:
#         chosen = band_names[0]
#     if not chosen:
#         return {'aod_mean': None, 'aod_band_used': None}
#     mean_img = col.select(chosen).mean()
#     stats = reduce_mean(mean_img, aoi, scale=1000)
#     mean_val = list(stats.values())[0] if stats else None
#     return {'aod_mean': mean_val, 'aod_band_used': chosen}

# def get_elevation_stats(aoi):
#     dem = ee.Image(SRTM)
#     stats = reduce_mean(dem, aoi, scale=30)
#     elev = list(stats.values())[0] if stats else None
#     return {'elevation_mean_m': elev}

# def get_precipitation_total(aoi, start_date, end_date):
#     col = ee.ImageCollection(GPM_IMERG).filterDate(start_date, end_date).filterBounds(aoi)
#     first = col.first()
#     # detect band
#     band_names = []
#     try:
#         band_names = first.bandNames().getInfo()
#     except Exception:
#         band_names = []
#     chosen = None
#     for b in ['precipitationCal', 'precipitation', 'precipitationCal_1km']:
#         if b in band_names:
#             chosen = b
#             break
#     if not chosen and band_names:
#         chosen = band_names[0]
#     if not chosen:
#         return {'precip_total': None, 'precip_band_used': None}
#     precip_sum = col.select(chosen).sum()
#     stats = reduce_mean(precip_sum, aoi, scale=1000)
#     val = list(stats.values())[0] if stats else None
#     return {'precip_total_mean_mm': val, 'precip_band_used': chosen}

# def get_landcover_stats(aoi):
#     # Get first image from collection
#     wc_image = ee.ImageCollection(WORLD_COVER).first().select('Map')
    
#     # frequency histogram
#     hist = wc_image.reduceRegion(
#         ee.Reducer.frequencyHistogram(),
#         aoi,
#         scale=10,
#         maxPixels=MAX_PIXELS
#     )
#     hist_i = safe_getinfo(hist)
#     dominant = None
#     if hist_i:
#         try:
#             d = list(hist_i.values())[0]
#             items = [(int(k), int(v)) for k, v in d.items()]
#             items.sort(key=lambda x: x[1], reverse=True)
#             dominant = items[0][0] if items else None
#         except Exception:
#             dominant = None
#     return {'landcover_dominant_class': dominant}


# def get_water_proximity_and_floodscore(aoi, start_date, end_date):
#     # JRC GlobalSurfaceWater occurrence band indicates percent of time water seen; use >50% as persistent water
#     occ = ee.Image(JRC_GSW).select('occurrence')
#     # create mask of persistent water
#     persistent = occ.gte(50)
#     # compute distance to persistent water (meters)
#     distance = persistent.Not().fastDistanceTransform(30).sqrt()  # alternative methods exist
#     # Note: EE distance transforms may be awkward. Simpler: buffer water and check proximity by reduction of min distance.
#     # We'll compute mean occurrence (low occurrence -> less water), use elevation & precipitation to compute a simple flood score.
#     occ_mean = reduce_mean(occ, aoi, scale=30)
#     occ_val = list(occ_mean.values())[0] if occ_mean else None

#     # Use elevation and precipitation to combine flood-like risk (lower elevation + higher precip)
#     elev = get_elevation_stats(aoi)['elevation_mean_m']
#     precip = get_precipitation_total(aoi, start_date, end_date)['precip_total_mean_mm']
#     # Normalize simple flood score between 0 and 1:
#     # low elevation => more risk (we'll map elevation to 0..1 by using a heuristic: 0 m -> 1, 200 m -> 0)
#     elev_norm = None
#     if elev is not None:
#         elev_norm = max(0.0, min(1.0, 1.0 - (elev / 200.0)))
#     # precip norm: assume 0-2000 mm range
#     precip_norm = None
#     if precip is not None:
#         precip_norm = max(0.0, min(1.0, precip / 2000.0))
#     # occurrence of water increases flood propensity
#     occ_norm = None
#     if occ_val is not None:
#         occ_norm = max(0.0, min(1.0, occ_val / 100.0))
#     # combine: flood_score = weighted sum
#     components = []
#     weights = []
#     if elev_norm is not None:
#         components.append(elev_norm); weights.append(0.4)
#     if precip_norm is not None:
#         components.append(precip_norm); weights.append(0.4)
#     if occ_norm is not None:
#         components.append(occ_norm); weights.append(0.2)
#     flood_score = None
#     if components:
#         # weighted average
#         flood_score = sum([c*w for c,w in zip(components, weights)]) / sum(weights)
#     return {'water_occurrence_mean': occ_val, 'flood_risk_score': flood_score}

# # ---------- SUITABILITY HEURISTICS ----------
# def compute_suitabilities(profile):
#     """
#     Very simple heuristic scores (0..1):
#      - greenspace_priority: high when population density high, NDVI low, LST high
#      - industrial_suitability: high when landcover non-residential, flood risk low, scent of nightlight/activity high (we don't compute nightlights here)
#      - residential_suitability: medium when air quality ok, flood risk low, proximity to greenspace
#     These are starting heuristics — you should refine with local policy weights.
#     """
#     # helper safe-get
#     def g(k):
#         return profile.get(k)

#     pop = g('population_density_mean_per_km2') or 0
#     ndvi = g('ndvi_mean') or 0.0
#     pct_green = g('pct_green') or 0.0
#     lst = g('lst_mean_celsius_est') or 0.0
#     aod = g('aod_mean') or 0.0
#     flood = g('flood_risk_score') or 0.0
#     landclass = profile.get('landcover_dominant_class')

#     # Normalize inputs to 0..1 with simple heuristics
#     pop_norm = max(0.0, min(1.0, pop / 10000.0))   # 10k people/km2 -> 1
#     ndvi_norm = max(0.0, min(1.0, (ndvi + 0.2) / 0.8))  # NDVI ~ -0.2..0.6 -> map
#     lst_norm = max(0.0, min(1.0, (lst - 20.0) / 25.0))   # 20C -> 0, 45C -> 1
#     aod_norm = max(0.0, min(1.0, aod / 1.0))   # AOD of 1.0 -> high
#     flood_norm = max(0.0, min(1.0, flood))

#     # Greenspace priority: want high pop, low ndvi, high lst
#     greenspace_priority = (0.5 * pop_norm) + (0.3 * (1 - ndvi_norm)) + (0.2 * lst_norm)
#     greenspace_priority = max(0.0, min(1.0, greenspace_priority))

#     # Industrial suitability: prefer non-dense residential (low pop), low flood, low AOD constraint (we prefer areas where factory won't harm many)
#     # For simplicity: industry good when pop low AND flood low AND landcover is 'non-built' OR 'sparsely built' (we'll penalize class 50: Built-up)
#     industry_score = (0.5 * (1 - pop_norm)) + (0.4 * (1 - flood_norm)) + (0.1 * (1 - aod_norm))
#     industry_score = max(0.0, min(1.0, industry_score))

#     # Residential suitability: prefer low flood, low AOD, some green nearby (pct_green)
#     res_score = (0.4 * (1 - flood_norm)) + (0.3 * (1 - aod_norm)) + (0.3 * pct_green)
#     res_score = max(0.0, min(1.0, res_score))

#     return {
#         'greenspace_priority': greenspace_priority,
#         'industrial_suitability': industry_score,
#         'residential_suitability': res_score,
#         'best_use': ('greenspace' if greenspace_priority >= max(industry_score, res_score)
#                      else ('residential' if res_score >= industry_score else 'industrial'))
#     }

# # ---------- MAIN FLOW ----------
# def build_profile(aoi_ee, geojson_geom, start_date=START_DATE, end_date=END_DATE):
#     profile = {}
#     profile['generated_at'] = datetime.datetime.now(datetime.UTC).isoformat()
#     profile['analysis_window'] = {'start': start_date, 'end': end_date}
#     profile['geometry'] = geojson_geom

#     print("Collecting population density...")
#     profile.update(get_population_density_sedac(aoi_ee, year=2020))



#     print("Collecting NDVI stats (Sentinel-2 median)...")
#     ndvi = get_ndvi_stats(aoi_ee, start_date, end_date)
#     profile.update(ndvi)

#     print("Collecting LST stats (MODIS)...")
#     lst = get_lst_stats(aoi_ee, start_date, end_date)
#     profile.update(lst)

#     print("Collecting AOD stats (MAIAC)...")
#     aod = get_aod_stats(aoi_ee, start_date, end_date)
#     profile.update(aod)

#     print("Collecting elevation (SRTM)...")
#     elev = get_elevation_stats(aoi_ee)
#     profile.update(elev)

#     print("Collecting precipitation (GPM IMERG)...")
#     precip = get_precipitation_total(aoi_ee, start_date, end_date)
#     profile.update(precip)

#     print("Collecting landcover (ESA WorldCover)...")
#     lc = get_landcover_stats(aoi_ee)
#     profile.update(lc)

#     print("Collecting water occurrence & flood proxy...")
#     flood = get_water_proximity_and_floodscore(aoi_ee, start_date, end_date)
#     profile.update(flood)

#     print("Computing suitabilities...")
#     suits = compute_suitabilities(profile)
#     profile['suitability'] = suits

#     return profile

# if __name__ == "__main__":
#     geojson_path = sys.argv[1] if len(sys.argv) > 1 else None
#     print("Using GeoJSON:", geojson_path if geojson_path else "default bbox")

#     aoi_ee, geojson_geom = read_geojson_to_eegeom(geojson_path)

#     # Build profile
#     result = build_profile(aoi_ee, geojson_geom, start_date=START_DATE, end_date=END_DATE)

#     # Save to file
#     out_file = "aoi_profile.json"
#     with open(out_file, "w") as f:
#         json.dump(result, f, indent=2)
#     print(f"Saved AOI profile to {out_file}")

#     # Print concise summary
#     print("SUMMARY:")
#     print(" Population density (mean):", result.get('population_density_mean_per_km2'))
#     print(" NDVI mean:", result.get('ndvi_mean'), "Pct green:", result.get('pct_green'))
#     print(" LST (C):", result.get('lst_mean_celsius_est'))
#     print(" AOD (mean):", result.get('aod_mean'))
#     print(" Elevation (m mean):", result.get('elevation_mean_m'))
#     print(" Precip total (mm mean):", result.get('precip_total_mean_mm'))
#     print(" Flood risk score (0..1):", result.get('flood_risk_score'))
#     print(" Suitability:", result.get('suitability'))

    



