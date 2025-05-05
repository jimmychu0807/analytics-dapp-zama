"use client";

import { Button } from "@/components/ui/button";
import { MAX_METAS, parseFormDataIntoQuestionData } from "@/utils";
import { sendAnalyticTransaction } from "@/utils/chainInteractions";
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
import { ChevronDownIcon, PlusIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import { MessageCircleQuestion } from "lucide-react";
import { type FormEvent, type MouseEvent, type ChangeEvent, useState } from "react";
import { usePublicClient, useWalletClient } from "wagmi";

// Styles
const labelClasses = "text-sm/6 font-medium text-black text-right";
const textInputClasses = clsx(
  "mt-3 block w-full rounded-lg border-none bg-black/5 px-3 py-1.5 text-sm/6 text-black",
  "focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-black/25",
);
const selectInputClasses = clsx(
  "mt-3 block w-full appearance-none rounded-lg border-none bg-black/5 px-3 py-1.5 text-sm/6 text-black",
  "focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-black/25",
  "*:text-black",
);

export function NewQuestionDialog() {
  const [isDialogOpen, setDialogOpen] = useState<boolean>(false);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [metaNum, setMetaNum] = useState<number>(0);
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const incMeta = (ev: MouseEvent<HTMLElement>) => {
    ev.preventDefault();
    if (metaNum < MAX_METAS) {
      setMetaNum((mn) => mn + 1);
    }
  };

  const closeBtnClicked = (ev: MouseEvent<HTMLElement>) => {
    ev.preventDefault();
    closeDialog();
  };

  const closeDialog = () => {
    setMetaNum(0);
    setDialogOpen(false);
  };

  const submitNewQuestion = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();

    const formData = new FormData(ev.target as HTMLFormElement);
    // TODO: perform data validation on formData

    if (!publicClient || !walletClient) return;

    setLoading(true);
    const questionObj = parseFormDataIntoQuestionData(formData);
    const { main, metas, startTime, endTime, queryThreshold } = questionObj;

    try {
      const receipt = await sendAnalyticTransaction(publicClient, walletClient, "newQuestion", [
        main,
        metas,
        startTime,
        endTime,
        queryThreshold,
      ]);

      console.log("newQuestion", receipt);

      // Close only when the above ops succeeed
      setMetaNum(0);
      setDialogOpen(false);
    } catch (err) {
      console.error("Error on submitNewQuestion:", (err as Error).message);
    }
    setLoading(false);
  };

  return (
    <>
      <Button variant="outline" size="lg" onClick={() => setDialogOpen(true)}>
        <MessageCircleQuestion />
        New Question
      </Button>
      <Dialog
        transition
        open={isDialogOpen}
        onClose={closeDialog}
        className="relative z-50 transition duration-300 ease-out data-closed:opacity-0"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-lg w-1/2 max-h-4/5 overflow-y-auto space-y-4 border bg-white p-6 rounded-lg shadow-xl">
            <DialogTitle className="font-bold text-center">New Question</DialogTitle>

            <form onSubmit={submitNewQuestion}>
              <QuestionSpec legendName="Main Question" prefix="main" />

              {/*Start time, end time */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Field className="col-span-2">
                  <div className="grid grid-cols-2 items-center gap-4">
                    <Label className={labelClasses}>Start Time</Label>
                    <Input
                      required
                      type="datetime-local"
                      name="start-datetime"
                      className={textInputClasses}
                    />
                  </div>
                </Field>
                <Field className="col-start-3 col-span-2">
                  <div className="grid grid-cols-2 items-center gap-4">
                    <Label className={labelClasses}>End Time</Label>
                    <Input
                      required
                      type="datetime-local"
                      name="end-datetime"
                      className={textInputClasses}
                    />
                  </div>
                </Field>
              </div>

              {/* queryThreshold */}
              <Field>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className={labelClasses}>Query Threshold</Label>
                  <Input
                    required
                    min={0}
                    type="number"
                    name="query-threshold"
                    className={clsx(textInputClasses, "col-span-3")}
                  />
                </div>
              </Field>

              <div>
                <span className="text-sm font-semibold px-4">Meta Information ({metaNum}/4)</span>
                <Button variant="outline" size="icon" onClick={incMeta} className="mt-2">
                  <PlusIcon />
                </Button>
              </div>
              {[...Array(metaNum).keys()].map((idx) => (
                <QuestionSpec
                  key={`criteria-${idx}`}
                  legendName={`Criteria ${idx + 1}`}
                  prefix={`criteria${idx}`}
                />
              ))}

              <div className="flex gap-4 items-center justify-center py-4">
                <Button disabled={isLoading} variant="outline" onClick={closeBtnClicked}>
                  Cancel
                </Button>
                <Button isLoading={isLoading} type="submit">
                  Create
                </Button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}

function QuestionSpec({ legendName, prefix }: { legendName: string; prefix: string }) {
  const [qsType, setQsType] = useState<string>("option");
  const [optNum, setOptNum] = useState<number>(2);

  const typeChange = (ev: ChangeEvent<HTMLSelectElement>) => {
    setQsType(ev.target.value);
    if (ev.target.value === "value") {
      // reset the value
      setOptNum(2);
    }
  };

  const incOpt = (ev: MouseEvent<HTMLElement>) => {
    ev.preventDefault();
    setOptNum((on) => on + 1);
  };

  return (
    <>
      <Fieldset>
        <Legend className="text-sm font-semibold pl-4">{legendName}</Legend>
        <Field>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className={labelClasses}>Text</Label>
            <Input
              required
              name={`${prefix}-qText`}
              className={clsx(textInputClasses, "col-span-3")}
            />
          </div>
        </Field>

        <Field>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className={labelClasses}>Type</Label>
            <div className="relative col-span-3">
              <Select onChange={typeChange} name={`${prefix}-type`} className={selectInputClasses}>
                <option value="option">Option</option>
                <option value="value">Value</option>
              </Select>
              <ChevronDownIcon
                className="group pointer-events-none absolute top-5 right-2.5 size-4 fill-black/60"
                aria-hidden="true"
              />
            </div>
          </div>
        </Field>

        {qsType === "value" ? (
          <div className="grid grid-cols-4 items-center gap-4">
            <Field className="col-span-2">
              <div className="grid grid-cols-2 items-center gap-4">
                <Label className={labelClasses}>Min</Label>
                <Input type="number" min={0} name={`${prefix}-min`} className={textInputClasses} />
              </div>
            </Field>
            <Field className="col-start-3 col-span-2">
              <div className="grid grid-cols-2 items-center gap-4">
                <Label className={labelClasses}>Max</Label>
                <Input type="number" min={0} name={`${prefix}-max`} className={textInputClasses} />
              </div>
            </Field>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className={labelClasses}>Options</Label>
              <Button variant="outline" size="icon" onClick={incOpt} className="mt-2">
                <PlusIcon />
              </Button>
            </div>

            {[...Array(optNum).keys()].map((idx) => (
              <div key={`${prefix}-option-${idx}`} className="grid grid-cols-4 items-center gap-4">
                <Input
                  name={`${prefix}-option-${idx}`}
                  className={clsx(textInputClasses, "col-start-2 col-span-3")}
                />
              </div>
            ))}
          </>
        )}
      </Fieldset>
    </>
  );
}
