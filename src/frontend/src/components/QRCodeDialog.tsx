import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Printer } from "lucide-react";
import { QRCodeSVG } from "./QRCode";

interface QRCodeDialogProps {
  open: boolean;
  onClose: () => void;
  doorId: bigint;
  doorLabel: string;
}

export function QRCodeDialog({
  open,
  onClose,
  doorId,
  doorLabel,
}: QRCodeDialogProps) {
  const qrValue = `${window.location.origin}${window.location.pathname}?doorId=${doorId.toString()}&page=inspect`;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>QR Code - ${doorLabel}</title>
      <style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;padding:40px;}
      h2{margin-bottom:8px;} p{color:#666;margin-bottom:24px;font-size:14px;}
      .url{font-size:11px;color:#999;margin-top:16px;word-break:break-all;max-width:280px;text-align:center;}
      </style></head><body>
      <h2>${doorLabel}</h2>
      <p>Scan to open inspection form</p>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
      ${document.getElementById("qr-print-target")?.innerHTML ?? ""}
      </svg>
      <p class="url">${qrValue}</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm" data-ocid="qr_code.dialog">
        <DialogHeader>
          <DialogTitle>QR Code — {doorLabel}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <div
            className="p-4 bg-white rounded-xl border-2 border-border shadow-sm"
            id="qr-print-target"
          >
            <QRCodeSVG value={qrValue} size={220} level="H" />
          </div>
          <p className="text-xs text-muted-foreground text-center px-2 break-all">
            {qrValue}
          </p>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handlePrint}
              data-ocid="qr_code.print_button"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              data-ocid="qr_code.close_button"
            >
              <Download className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
