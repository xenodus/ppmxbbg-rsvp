import QRCode from "qrcode";

export async function copyQrCodeToClipboard(text) {
  const dataUrl = await QRCode.toDataURL(text, {
    width: 256,
    margin: 2,
    errorCorrectionLevel: "M",
  });
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("Copying images is not supported in this browser.");
  }
  const item = new ClipboardItem({ "image/png": blob });
  await navigator.clipboard.write([item]);
}
