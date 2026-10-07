import { Assets, type Texture } from 'pixi.js';
import { ASSET_MANIFEST, type AssetName } from './assetManifest';

export class AssetLoadError extends Error {
  public readonly name = 'AssetLoadError';
  public readonly assetName: AssetName;
  public readonly cause: unknown;

  public constructor(assetName: AssetName, cause: unknown) {
    super(`Failed to load match asset "${assetName}" (${ASSET_MANIFEST[assetName]}).`);
    this.assetName = assetName;
    this.cause = cause;
  }
}

export type AssetProgressCallback = (progress: number) => void;
export type LoadedAssets = Readonly<Record<AssetName, Texture>>;

export class AssetLoader {
  private loaded: LoadedAssets | undefined;

  public async load(onProgress?: AssetProgressCallback): Promise<LoadedAssets> {
    if (this.loaded) {
      onProgress?.(1);
      return this.loaded;
    }

    const names = Object.keys(ASSET_MANIFEST) as AssetName[];
    const result = {} as Record<AssetName, Texture>;
    onProgress?.(0);
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      try {
        result[name] = await Assets.load(ASSET_MANIFEST[name]);
      } catch (error) {
        throw new AssetLoadError(name, error);
      }
      onProgress?.((index + 1) / names.length);
    }
    this.loaded = result;
    return result;
  }

  public retry(): void {
    this.loaded = undefined;
  }
}
