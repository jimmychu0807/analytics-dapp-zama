"use client";

import { Button } from "@/components/ui/button";
import { type QuestionSpec, type QuestionSet, QuestionType, QuestionState } from "@/types";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
  Field,
  Fieldset,
  Description,
  Radio,
  RadioGroup,
  Label,
  Input,
  Select,
} from "@headlessui/react";
import clsx from "clsx";
import { type MouseEvent, type FormEvent, useState } from "react";
import { usePublicClient, useWalletClient } from "wagmi";

// Styles
const labelClasses = "text-sm/6 font-medium text-black text-right";
const textInputClasses = clsx(
  "block w-full rounded-lg border-none bg-black/5 px-3 py-1.5 text-sm/6 text-black",
  "focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-black/25",
);

export function AnswerQuestionDialog({
  qId,
  questionSet,
}: {
  qId: number;
  questionSet: QuestionSet;
}) {
  const [isDialogOpen, setDialogOpen] = useState<boolean>(false);
  const [isLoading, setLoading] = useState<boolean>(false);
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const closeBtnClicked = (ev: MouseEvent<HTMLElement>) => {
    ev.preventDefault();
    setDialogOpen(false);
  };

  const submitAnswerQuestion = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();

    console.log("submitAnswerQuestion");

    const formData = new FormData(ev.target as HTMLFormElement);
    // TODO: perform data validation on formData

    if (!publicClient || !walletClient) return;

    setLoading(true);

    for (const [name, val] of formData.entries()) {
      console.log(`${name}: ${val}`);
    }

    setLoading(false);
    setDialogOpen(false);
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
            <form onSubmit={submitAnswerQuestion}>
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
                <Input type="radio" name={name} value={idx} />
                <Label className="text-sm text-black">{option}</Label>
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
