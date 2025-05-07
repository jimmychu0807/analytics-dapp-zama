import { Button } from "@/components/ui/button";
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from "@headlessui/react";
import { type MouseEvent, useState, useEffect } from "react";
import { type QuestionSet, RequestState, type QueryRequest } from "@/types";

export function QueryResultDialog({
  qId,
  questionSet,
  qrId,
}: {
  qId: number;
  questionSet: QuestionSet;
  qrId: bigint;
}) {
  const [isDialogOpen, setDialogOpen] = useState<boolean>(false);

  return <>
    <Button variant="outline" className="min-w-22"
      onClick={() => setDialogOpen(true) }
    >
      View
    </Button>
    <Dialog
      transition
      open={isDialogOpen}
      onClose={() => setDialogOpen(false)}
      className="relative z-50 transition duration-300 ease-out data-closed:opacity-0"
    >
      <DialogBackdrop className="fixed inset-0 bg-black/30" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel className="flex flex-col items-center max-w-lg w-1/2 max-h-4/5 overflow-y-auto space-y-4 border bg-white p-6 rounded-lg shadow-xl">
          <DialogTitle className="font-bold text-center">Query Result</DialogTitle>
        </DialogPanel>
      </div>
    </Dialog>
  </>
}
