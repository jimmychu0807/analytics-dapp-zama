"use client";
import {
  type FormEvent,
  type MouseEvent,
  type ChangeEvent,
  useState,
} from "react";
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
import { MessageCircleQuestion } from "lucide-react";

import clsx from "clsx";
import { Button } from "@/components/ui/button";

import { MAX_METAS } from "@/utils";

export default function NewQuestionDialog() {
  const [isDialogOpen, setDialogOpen] = useState<boolean>(false);
  const [metaNum, setMetaNum] = useState<number>(0);

  const incMeta = (ev: MouseEvent<HTMLElement>) => {
    ev.preventDefault();
    if (metaNum < MAX_METAS) {
      setMetaNum((mn) => mn + 1);
    }
  };

  const closeDialog = () => {
    setMetaNum(0);
    setDialogOpen(false);
  };

  const submitNewQuestion = (ev: FormEvent<HTMLElement>) => {
    ev.preventDefault();
    console.log("submit new question");
    setMetaNum(0);
    setDialogOpen(false);
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
            <DialogTitle className="font-bold text-center">
              New Question
            </DialogTitle>

            <form onSubmit={submitNewQuestion}>
              <QuestionSpec legendName="Main Question" prefix="main" />
              <div>
                <span className="text-sm font-semibold px-4">
                  Filter Criteria ({metaNum}/4)
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={incMeta}
                  className="mt-2"
                >
                  <PlusIcon />
                </Button>
              </div>
              {[...Array(metaNum).keys()].map((idx) => (
                <QuestionSpec
                  key={`criteria-${idx}`}
                  legendName={`Criteria ${idx}`}
                  prefix={`criteria-${idx}`}
                />
              ))}

              <div className="flex gap-4 items-center justify-center py-4">
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}

function QuestionSpec({
  legendName,
  prefix,
}: {
  legendName: string;
  prefix: string;
}) {
  const [qsType, setQsType] = useState<string>("count");
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

  const labelClasses = "text-sm/6 font-medium text-black text-right";
  const textInputClasses = clsx(
    "mt-3 block w-full rounded-lg border-none bg-black/5 px-3 py-1.5 text-sm/6 text-black",
    "focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-black/25"
  );
  const selectInputClasses = clsx(
    "mt-3 block w-full appearance-none rounded-lg border-none bg-black/5 px-3 py-1.5 text-sm/6 text-black",
    "focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-black/25",
    "*:text-black"
  );

  return (
    <>
      <Fieldset>
        <Legend className="text-sm font-semibold pl-4">{legendName}</Legend>
        <Field>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className={labelClasses}>Text</Label>
            <Input
              name={`${prefix}-qText`}
              className={clsx(textInputClasses, "col-span-3")}
            />
          </div>
        </Field>

        <Field>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className={labelClasses}>Type</Label>
            <div className="relative col-span-3">
              <Select
                onChange={typeChange}
                name={`${prefix}-type`}
                className={selectInputClasses}
              >
                <option value="count">Count</option>
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
                <Input
                  type="number"
                  name={`${prefix}-min`}
                  className={textInputClasses}
                />
              </div>
            </Field>
            <Field className="col-start-3 col-span-2">
              <div className="grid grid-cols-2 items-center gap-4">
                <Label className={labelClasses}>Max</Label>
                <Input
                  type="number"
                  name={`${prefix}-max`}
                  className={textInputClasses}
                />
              </div>
            </Field>
          </div>
        ) : (
          <>
            <Field>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className={labelClasses}>Options</Label>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={incOpt}
                  className="mt-2"
                >
                  <PlusIcon />
                </Button>
              </div>
            </Field>

            {[...Array(optNum).keys()].map((idx) => (
              <div
                key={`${prefix}-option-${idx}`}
                className="grid grid-cols-4 items-center gap-4"
              >
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
