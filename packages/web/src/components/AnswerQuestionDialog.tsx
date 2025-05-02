"use client";

import { Button } from "@/components/ui/button";
import { type QuestionSet, QuestionState } from "@/types";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
  Field,
  Fieldset,
  Legend,
  Label,
  Input,
  Select,
} from "@headlessui/react";
import { type MouseEvent, useState } from "react";

export function AnswerQuestionDialog({
  qId,
  questionSet,
}: {
  qId: number;
  questionSet: QuestionSet;
}) {
  const [isDialogOpen, setDialogOpen] = useState<boolean>(false);
  const [isLoading, setLoading] = useState<boolean>(false);

  const closeBtnClicked = (ev: MouseEvent<HTMLElement>) => {
    ev.preventDefault();
    setDialogOpen(false);
  };

  const submitAnswerQuestion = async () => {
    console.log("submitAnswerQuestion");
  };

  return (
    <>
      <Button variant="outline" onClick={() => setDialogOpen(true)}>
        Answer
      </Button>
      <Dialog
        transition
        open={isDialogOpen}
        onClose={() => setDialogOpen(false)}
        className="relative z-50 transition duration-300 ease-out data-closed:opacity-0"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-lg w-1/2 max-h-4/5 overflow-y-auto space-y-4 border bg-white p-6 rounded-lg shadow-xl">
            <DialogTitle className="font-bold text-center">{questionSet.main.text}</DialogTitle>
            <form onSubmit={submitAnswerQuestion}>
              <div className="flex gap-4 items-center justify-center py-4">
                <Button disabled={isLoading} variant="outline" onClick={closeBtnClicked}>
                  Cancel
                </Button>
                <Button isLoading={isLoading} type="submit">
                  Answer
                </Button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
