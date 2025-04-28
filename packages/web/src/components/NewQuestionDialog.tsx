'use client';
import { useState } from 'react'
import { Description, Dialog, DialogPanel, DialogTitle, DialogBackdrop, Field, Label, Input } from '@headlessui/react'
import { MessageCircleQuestion } from "lucide-react"
import clsx from "clsx";
import { Button } from "@/components/ui/button"

export default function NewQuestionDialog() {
  let [isDialogOpen, setDialogOpen] = useState<boolean>(false)

  const labelClasses="text-sm/6 font-medium text-black";
  const textInputClasses=clsx(
    "mt-3 block w-full rounded-lg border-none bg-black/5 px-3 py-1.5 text-sm/6 text-black col-span-3",
    "focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-black/25"
  )

  return <>
    <Button variant="outline" size="lg" onClick={() => setDialogOpen(true)}>
      <MessageCircleQuestion/>
      New Question
    </Button>
    <Dialog transition open={isDialogOpen} onClose={() => setDialogOpen(false)}
      className="relative z-50 transition duration-300 ease-out data-closed:opacity-0"
    >
      <DialogBackdrop className="fixed inset-0 bg-black/30" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel className="max-w-lg space-y-4 border bg-white p-12 rounded-lg shadow-xl">
          <DialogTitle className="font-bold">New Question</DialogTitle>

          <form>
            <Field>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className={labelClasses}>Text</Label>
                <Input id="qText" name="qText" className={textInputClasses} />
              </div>
            </Field>

            <Field>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className={labelClasses}>Type</Label>
              </div>
            </Field>
          </form>

          <div className="flex gap-4 items-center justify-center">
            <Button>Create Question</Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  </>
}
