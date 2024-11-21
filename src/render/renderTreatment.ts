import { CogMetadata, ImageRenderer2 } from "../types";
import { colorScale, ColorScaleParams } from "./colorScale";

type Options = CogMetadata & { colorScale: ColorScaleParams };

const renderTreatment: ImageRenderer2<Options> = (
  data,
  data2,
  { offset, scale, noData, colorScale: colorScaleParams }
) => {
  const band = data[0];
  const band2 = data2[0];

  const pixels = band.length;
  const rgba = new Uint8ClampedArray(pixels * 4);
  const interpolate = colorScale(colorScaleParams);

  let minpx = 1000000;
  let maxpx = -1000000;

  for (let i = 0; i < pixels; i++) {
    const value = band[i];
    const value2 = band2[i];

    const res = ((value - value2) / (value + value2 || 1)) * 10000;
    const px = offset + res * scale;

    if (px === noData || isNaN(px) || px === Infinity || px == -0.1) {
      rgba[4 * i] = 0; // Rouge
      rgba[4 * i + 1] = 0; // Vert
      rgba[4 * i + 2] = 0; // Bleu
      rgba[4 * i + 3] = 0; // Alpha (transparent)
    } else {
      // console.log(px, res, value, value2);

      minpx = Math.min(minpx, px);
      maxpx = Math.max(maxpx, px);

      const color = interpolate(px);
      rgba[4 * i] = color[0]; // Rouge
      rgba[4 * i + 1] = color[1]; // Vert
      rgba[4 * i + 2] = color[2]; // Bleu
      rgba[4 * i + 3] = 255; // Alpha (opaque)
    }
  }

  console.log(minpx, maxpx);
  return rgba;
};

export default renderTreatment;
