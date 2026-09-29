import { sanitizePrint } from "./store";

const escapeXml = (text) => String(text).replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[char]));

export function printColor(design, fabric) {
  if (design.ink !== "auto") return design.ink;
  const rgb = (fabric.match(/[a-f0-9]{2}/gi) || ["30", "33", "31"]).map((part) => parseInt(part, 16));
  return rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 150 ? "#242820" : "#f0ede3";
}

// One SVG source is used by product cards, the bag, and the curved 3D print.
export function artworkSvg(value, fabric = "#303331") {
  const design = sanitizePrint(value);
  const ink = printColor(design, fabric);
  const font = { sans: "Arial, sans-serif", serif: "Georgia, serif", mono: "Courier New, monospace" }[design.font];
  const symbol = {
    monogram: `<text x="256" y="218" text-anchor="middle" font-family="Georgia, serif" font-size="${design.monogram.length > 2 ? 84 : 128}">${escapeXml(design.monogram)}</text>`,
    orbit: `<g fill="none" stroke="${ink}" stroke-width="5"><ellipse cx="256" cy="172" rx="89" ry="33"/><ellipse cx="256" cy="172" rx="89" ry="33" transform="rotate(60 256 172)"/><ellipse cx="256" cy="172" rx="89" ry="33" transform="rotate(-60 256 172)"/></g><circle cx="256" cy="172" r="11"/><circle cx="336" cy="189" r="8"/>`,
    bolt: '<path d="M268 72 187 181h61l-12 101 89-128h-66Z"/>',
    upload: `<image href="${escapeXml(design.image)}" x="160" y="75" width="192" height="192" preserveAspectRatio="xMidYMid meet"/>`,
    none: "",
  }[design.logo];
  const textSize = Math.min(38, 600 / Math.max(1, Array.from(design.text).length));
  const text = design.text ? `<text x="256" y="${design.logo === "none" ? 248 : 336}" text-anchor="middle" font-family="${font}" font-size="${textSize}" font-weight="700">${escapeXml(design.text)}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><g fill="${ink}" transform="translate(256 256) scale(${design.scale / 100}) translate(-256 -256)">${symbol}${text}${design.text || design.logo !== "none" ? `<path d="M224 370h64" stroke="${ink}" stroke-width="2"/><text x="256" y="397" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" letter-spacing="3">ONE OF ONE</text>` : ""}</g></svg>`;
}

export function artworkUrl(design, fabric) { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(artworkSvg(design, fabric))}`; }
export function printOnSide(design, back) {
  const print = design[back ? "back" : "front"];
  return !!print?.enabled && (!!print.text || print.logo !== "none");
}

export async function prepareLogo(file) {
  if (!file || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Choose a PNG, JPG, or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Choose a logo smaller than 5 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth * img.naturalHeight > 24000000) throw new Error("Choose an image under 24 megapixels.");
    const canvas = document.createElement("canvas");
    for (const limit of [384, 256, 160]) {
      const scale = Math.min(1, limit / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/webp", 0.82);
      if (data.length <= 65000) return { image: data, imageName: file.name };
    }
    throw new Error("This logo is too detailed. Try a simpler or smaller image.");
  } catch (error) {
    if (error.name === "EncodingError") throw new Error("This image could not be opened. Try another PNG, JPG, or WebP.");
    throw error;
  } finally { URL.revokeObjectURL(url); }
}
