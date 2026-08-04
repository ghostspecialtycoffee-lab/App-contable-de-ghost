import {
  archiveBrandAssetClient,
  setPrimaryBrandAssetClient,
  uploadBrandAssetClient,
} from "./brand-client";

export async function uploadBrandAsset(
  input: Parameters<typeof uploadBrandAssetClient>[0],
) {
  return uploadBrandAssetClient(input);
}

export async function setPrimaryBrandAsset(assetId: string) {
  return setPrimaryBrandAssetClient(assetId);
}

export async function archiveBrandAsset(assetId: string) {
  return archiveBrandAssetClient(assetId);
}
