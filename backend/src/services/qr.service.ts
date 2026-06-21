import QRCode from "qrcode";

export async function generateQrPngBuffer(data: string): Promise<Buffer> {
  return QRCode.toBuffer(data, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });
}

export async function generateQrDataUrl(data: string): Promise<string> {
  return QRCode.toDataURL(data, { errorCorrectionLevel: "M", margin: 2, width: 320 });
}
