// Simple QR code component using qrserver.com API
interface QRCodeSVGProps {
  value: string;
  size?: number;
  level?: string;
  className?: string;
}

export function QRCodeSVG({ value, size = 200 }: QRCodeSVGProps) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(value)}&size=${size}x${size}&ecc=H`;
  return (
    <img
      src={url}
      alt="QR Code"
      width={size}
      height={size}
      style={{ imageRendering: "pixelated" }}
    />
  );
}
