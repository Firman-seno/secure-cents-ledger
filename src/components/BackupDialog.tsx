import { useState } from "react";
import { toast } from "sonner";
import { DatabaseBackup, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useCreateFullBackup } from "@/lib/backup-queries";

export function BackupButton({
  variant = "default",
}: {
  filteredTransactions?: import("@/lib/finance").Transaction[];
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const createBackup = useCreateFullBackup();

  async function start() {
    setProgress(0);
    try {
      await createBackup.mutateAsync();
      setProgress(100);
      toast.success("Snapshot database berhasil dibuat tanpa data duplikat.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "❌ Backup gagal. Silakan coba lagi.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (progress === null ? setOpen(v) : null)}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <DatabaseBackup className="size-4" /> Backup database
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Buat snapshot database</DialogTitle>
          <DialogDescription>
            Simpan versi lengkap akun, transaksi, profil, dan pengaturan Anda di database Kelola.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
            <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              Perubahan create, update, dan delete sudah dicatat otomatis. Snapshot ini membuat titik pemulihan tambahan untuk seluruh data saat ini.
            </p>
            {progress !== null ? (
              <div className="grid gap-2">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
              </div>
            ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={progress !== null}>
            Cancel
          </Button>
          <Button onClick={start} disabled={progress !== null}>
            {progress !== null ? <Loader2 className="size-4 animate-spin" /> : null}
            Start backup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
