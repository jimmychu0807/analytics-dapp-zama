"use client";

import { Button } from "@/components/ui/button";
import { useFhevm } from "@/contexts/FhevmContext";
import { type QuestionSpec, type QuestionSet, QuestionType } from "@/types";
import { parseFormDataIntoAnswerData } from "@/utils";
import { submitAnswerTx } from "@/utils/chainInteractions";
import {
  Dialog,
  DialogPanel,
  DialogBackdrop,
  Field,
  Description,
  RadioGroup,
  Label,
  Input,
} from "@headlessui/react";
import clsx from "clsx";
import { type MouseEvent, type FormEvent, useState } from "react";
import { usePublicClient, useWalletClient } from "wagmi";

// Styles
const labelClasses = "text-sm/6 font-medium text-black";
const textInputClasses = clsx(
  "block w-full rounded-lg border-none bg-black/5 px-3 py-1.5 text-sm/6 text-black",
  "focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-black/25",
);

export function AnswerDialog({ qId, questionSet }: { qId: number; questionSet: QuestionSet }) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const fhevm = useFhevm();

  const [isDialogOpen, setDialogOpen] = useState<boolean>(false);
  const [isLoading, setLoading] = useState<boolean>(false);

  const closeBtnClicked = (ev: MouseEvent<HTMLElement>) => {
    ev.preventDefault();
    setDialogOpen(false);
  };

  const submitAnswer = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const formData = new FormData(ev.target as HTMLFormElement);

    if (!publicClient || !walletClient || !fhevm) return;

    setLoading(true);
    try {
      const ansObj = parseFormDataIntoAnswerData(formData);
      const receipt = await submitAnswerTx(publicClient, walletClient, fhevm, qId, ansObj);
      console.log("submitAnswer receipt:", receipt);

      setDialogOpen(false);
    } catch (err) {
      console.error("Error on submitAnswer:", (err as Error).message);
    }

    setLoading(false);
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
            <form onSubmit={submitAnswer}>
              <AnswerSpec questionSpec={questionSet.main} name="main" />

              {questionSet.metas.length > 0 && (
                <div className="px-4 py-4 border border-solid rounded-lg">
                  <p className="font-semibold text-center text-lg pb-2">Meta Information</p>
                  {questionSet.metas.map((meta, idx) => (
                    <AnswerSpec key={`meta-${idx}`} questionSpec={meta} name={`meta-${idx}`} />
                  ))}
                </div>
              )}

              {/* action buttons */}
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

function AnswerSpec({ questionSpec, name }: { questionSpec: QuestionSpec; name: string }) {
  return (
    <>
      <div className="font-bold text-center my-3">{questionSpec.text}</div>
      <div className="w-4/5 mx-auto my-4">
        {questionSpec.t === QuestionType.Option ? (
          <RadioGroup className="space-y-2">
            {questionSpec.options.map((option, idx) => (
              <Field key={`opt-${idx}`} className="flex items-center gap-2">
                <Input type="radio" required name={name} value={idx} />
                <Label className={labelClasses}>{option}</Label>
              </Field>
            ))}
          </RadioGroup>
        ) : (
          <>
            <Description className="text-sm/6 text-black/50">
              Range: {Number(questionSpec.min)} - {Number(questionSpec.max)}
            </Description>
            <Input
              className={textInputClasses}
              name={name}
              required
              type="number"
              min={Number(questionSpec.min)}
              max={Number(questionSpec.max)}
            />
          </>
        )}
      </div>
    </>
  );
}
