import { GetResourceResponse, RequestParameters } from "maplibre-gl";

import CogReader from "./read/CogReader";
import { HEXColor } from "./render/colorScale";
import renderColor from "./render/renderColor";
import renderTreatment from "./render/renderTreatment";
import renderPhoto from "./render/renderPhoto";
import renderTerrain from "./render/renderTerrain";
import { TileJSON } from "./types";

export const TILE_SIZE = 256;

// const downloadBitmapImage = async (imageBitmap:ImageBitmap) => {
//   // Créer un Canvas pour dessiner l'ImageBitmap
//   const canvas = document.createElement("canvas");
//   const context = canvas.getContext("2d");

//   if (context){

//   // Définir les dimensions du canvas
//   canvas.width = imageBitmap.width;
//   canvas.height = imageBitmap.height;

//   // Dessiner l'ImageBitmap sur le canvas
//   context.drawImage(imageBitmap, 0, 0);

//   // Convertir le canvas en une URL de données (Blob URL)
//   canvas.toBlob((blob) => {
//     if (blob) {
//       // Créer un lien de téléchargement
//       const link = document.createElement("a");
//       link.href = URL.createObjectURL(blob);
//       link.download = "tile_image.png"; // Nom du fichier à télécharger
//       link.click(); // Simuler un clic pour démarrer le téléchargement
//     }
//   }, "image/png");
//   }

// };

// function calculateNDVI(
//   red: Uint8ClampedArray,
//   nir: Uint8ClampedArray
// ): Uint8ClampedArray {
//   if (nir.length !== red.length) {
//     throw new Error("Les tableaux NIR et RED doivent avoir la même taille.");
//   }

//   const ndviArray = new Uint8ClampedArray(nir.length);

//   for (let i = 0; i < nir.length; i++) {
//     const nirValue = nir[i];
//     const redValue = red[i];

//     const ndvi = (nirValue - redValue) / (nirValue + redValue || 1); // Éviter la division par zéro

//     // Normalisation dans l'intervalle [0, 255]
//     ndviArray[i] = Math.floor(((ndvi + 1) / 2) * 255);
//   }

//   return ndviArray;
// }

const renderTile = async (url: string) => {
  // Read URL parameters
  const re = new RegExp(/cog:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/);
  const result = url.match(re);
  if (!result) {
    throw new Error(`Invalid COG protocol URL '${url}'`);
  }
  const urlParts = result[1].split("#");
  const cogUrl = urlParts[0];

  urlParts.shift();

  const hash = urlParts.join("#") ?? "";
  const z = parseInt(result[2]);
  const x = parseInt(result[3]);
  const y = parseInt(result[4]);

  let rgba: Uint8ClampedArray;

  if (hash.startsWith("treatment")) {
    // console.log("NDVI");
    const urls = cogUrl.split("|");

    const cog = CogReader(urls[0]);
    const rawTile = await cog.getRawTile({ z, x, y });
    const metadata = await cog.getMetadata();
    // const red = renderPhoto(rawTile, metadata);
    // console.log(red);

    const cog2 = CogReader(urls[1]);
    const rawTile2 = await cog2.getRawTile({ z, x, y });
    
    // console
    // const metadata2 = await cog2.getMetadata();
    // const nir = renderPhoto(rawTile2, metadata2);
    // console.log(nir);

    // rgba = calculateNDVI(red, nir);

    const colorParams = hash.split("treatment").pop()?.substring(1);

    if (!colorParams) {
      throw new Error("Color params are not defined");
    } else {
      const customColorsString = colorParams.match(
        /\[("#([0-9a-fA-F]{3,6})"(,(\s)?)?)+\]/
      )?.[0];

      let colorScheme: string = "";
      let customColors: Array<HEXColor> = [];
      let minStr: string;
      let maxStr: string;
      let modifiers: string;

      if (customColorsString) {
        customColors = JSON.parse(customColorsString);

        [minStr, maxStr, modifiers] = colorParams
          .replace(`${customColorsString},`, "")
          .split(",");
      } else {
        [colorScheme, minStr, maxStr, modifiers] = colorParams.split(",");
      }
      const min = parseFloat(minStr),
        max = parseFloat(maxStr),
        isReverse = modifiers?.includes("-") || false,
        isContinuous = modifiers?.includes("c") || false;

      // const rgbaArray = new Float64Array(rgba);  // Création de l'instance de Uint8ClampedArray

      // Déclarez le tableau avec le type spécifique Uint8ClampedArray[]
      // const typedArrayArray: Float64Array[] = [rgbaArray];  // Encapsuler dans un tableau

      rgba = renderTreatment(rawTile, rawTile2, {
        ...metadata,
        colorScale: {
          colorScheme,
          customColors,
          min,
          max,
          isReverse,
          isContinuous,
        },
      });

      // console.log("FINAL ", rgba);
    }
  } else {
    // Read COG data
    const cog = CogReader(cogUrl);
    const rawTile = await cog.getRawTile({ z, x, y });
    const metadata = await cog.getMetadata();

    if (hash.startsWith("dem")) {
      rgba = renderTerrain(rawTile, metadata);
    } else if (hash.startsWith("color")) {
      const colorParams = hash.split("color").pop()?.substring(1);

      if (!colorParams) {
        throw new Error("Color params are not defined");
      } else {
        const customColorsString = colorParams.match(
          /\[("#([0-9a-fA-F]{3,6})"(,(\s)?)?)+\]/
        )?.[0];

        let colorScheme: string = "";
        let customColors: Array<HEXColor> = [];
        let minStr: string;
        let maxStr: string;
        let modifiers: string;

        if (customColorsString) {
          customColors = JSON.parse(customColorsString);

          [minStr, maxStr, modifiers] = colorParams
            .replace(`${customColorsString},`, "")
            .split(",");
        } else {
          [colorScheme, minStr, maxStr, modifiers] = colorParams.split(",");
        }
        const min = parseFloat(minStr),
          max = parseFloat(maxStr),
          isReverse = modifiers?.includes("-") || false,
          isContinuous = modifiers?.includes("c") || false;
        rgba = renderColor(rawTile, {
          ...metadata,
          colorScale: {
            colorScheme,
            customColors,
            min,
            max,
            isReverse,
            isContinuous,
          },
        });
      }
    } else {
      rgba = renderPhoto(rawTile, metadata);
    }
  }

  const image = await createImageBitmap(
    new ImageData(rgba, TILE_SIZE, TILE_SIZE)
  );
  return image;
};

const cogProtocol = async (
  params: RequestParameters
): Promise<GetResourceResponse<TileJSON | ImageBitmap>> => {
  if (params.type == "json") {
    const cogUrl = params.url.replace("cog://", "").split("#")[0].split("|")[0];
    const ret = {
      data: await CogReader(cogUrl).getTilejson(params.url),
    };
    return ret;
  } else if (params.type == "image") {
    return {
      data: await renderTile(params.url),
    };
  } else {
    throw new Error(`Unsupported request type '${params.type}'`);
  }
};

export default cogProtocol;
