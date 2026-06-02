import QRCode from "qrcode";

export function generateQrCodeDataUrl(text, { width = 128 } = {}) {
  return QRCode.toDataURL(text, {
    width,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}
