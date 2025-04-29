"use client";
import { useState } from "react";
import {
  Description,
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

export default function NewQuestionDialog() {
  let [isDialogOpen, setDialogOpen] = useState<boolean>(false);

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
      <Button variant="outline" size="lg" onClick={() => setDialogOpen(true)}>
        <MessageCircleQuestion />
        New Question
      </Button>
      <Dialog
        transition
        open={isDialogOpen}
        onClose={() => setDialogOpen(false)}
        className="relative z-50 transition duration-300 ease-out data-closed:opacity-0"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-lg w-1/2 space-y-4 border bg-white p-6 rounded-lg shadow-xl">
            <DialogTitle className="font-bold">New Question</DialogTitle>

            <form>
              <Fieldset>
                <Legend className="text-sm pl-4">Main Question</Legend>
                <Field>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className={labelClasses}>Text</Label>
                    <Input
                      name="qText"
                      className={clsx(textInputClasses, "col-span-3")}
                    />
                  </div>
                </Field>

                <Field>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className={labelClasses}>Type</Label>
                    <div className="relative col-span-3">
                      <Select className={selectInputClasses}>
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

                <Field>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className={labelClasses}>Min</Label>
                    <Input
                      type="number"
                      name="min"
                      className={textInputClasses}
                    />

                    <Label className={labelClasses}>Max</Label>
                    <Input
                      type="number"
                      name="max"
                      className={textInputClasses}
                    />
                  </div>
                </Field>

                <Field>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className={labelClasses}>Options</Label>
                    <Button variant="outline" size="icon">
                      <PlusIcon />
                    </Button>
                  </div>
                </Field>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Input
                    className={clsx(textInputClasses, "col-start-2 col-span-3")}
                  />
                </div>
              </Fieldset>
            </form>

            <div className="flex gap-4 items-center justify-center">
              <Button>Create Question</Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
