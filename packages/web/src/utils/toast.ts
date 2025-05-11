import { explorerPrefix } from "./index";
import { toast } from "sonner";

type ToastType = "success" | "failed";

export function showToastMessage(
  type: ToastType,
  opts: {
    tx?: string;
    message?: string;
  },
) {
  if (type === "success") {
    const { tx } = opts;
    toast.success("Tx succeeded", {
      description: `tx: ${tx}`,
      action: {
        label: "Check",
        onClick: () => window.open(`${explorerPrefix}/tx/${tx}`, "_blank", "noopener,noreferrer"),
      },
    });
  } else {
    toast.error("Tx failed", { description: opts.message });
  }
}
