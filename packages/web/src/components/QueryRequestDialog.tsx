import { NewQueryRequestDialog } from "@/components/NewQueryRequestDialog";
import { Button } from "@/components/ui/button";
import { type QuestionSet } from "@/types";
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from "@headlessui/react";
import { useState } from "react";

// import { usePublicClient, useWalletClient } from "wagmi";

export function QueryRequestDialog({
  qId,
  questionSet,
}: {
  qId: number;
  questionSet: QuestionSet;
}) {
  const [isDialogOpen, setDialogOpen] = useState<boolean>(false);

  return (
    <>
      <Button variant="outline" onClick={() => setDialogOpen(true)}>
        Query
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
            <DialogTitle className="font-bold text-center">Query Requests</DialogTitle>

            <NewQueryRequestDialog qId={qId} questionSet={questionSet} />
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
