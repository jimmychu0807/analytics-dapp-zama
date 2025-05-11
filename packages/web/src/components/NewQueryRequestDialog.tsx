import { Button } from "@/components/ui/button";
import { type QuestionSpec, type QuestionSet, QuestionType } from "@/types";
import { maxPredicates, parseFormDataIntoQueryRequestObj } from "@/utils";
import { sendAnalyticTransaction } from "@/utils/chainInteractions";
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop, Select, Input } from "@headlessui/react";
import { PlusIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import { useState, type MouseEvent, type ChangeEvent, type FormEvent } from "react";
import { usePublicClient, useWalletClient } from "wagmi";

export function NewQueryRequestDialog({
  qId,
  questionSet,
}: {
  qId: number;
  questionSet: QuestionSet;
}) {
  const [isDialogOpen, setDialogOpen] = useState<boolean>(false);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [predicateNum, setPredicateNum] = useState<number>(0);

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const incPredicate = (ev: MouseEvent<HTMLElement>) => {
    ev.preventDefault();
    if (predicateNum < maxPredicates) {
      setPredicateNum((p) => p + 1);
    }
  };

  const closeBtnClicked = (ev: MouseEvent<HTMLElement>) => {
    ev.preventDefault();
    closeDialog();
  };

  const closeDialog = () => {
    setPredicateNum(0);
    setDialogOpen(false);
  };

  const submitNewQueryRequest = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();

    const formData = new FormData(ev.target as HTMLFormElement);
    // TODO: perform data validation on formData

    if (!publicClient || !walletClient) return;

    setLoading(true);
    const queryRequestObj = parseFormDataIntoQueryRequestObj(formData);

    try {
      const receipt = await sendAnalyticTransaction(publicClient, walletClient, "requestQuery", [
        qId,
        queryRequestObj,
      ]);

      console.log("submitNewQueryRequest", receipt);
      closeDialog();
    } catch (err) {
      console.error("Error on submitNewQueryRequest:", (err as Error).message);
    }
    setLoading(false);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setDialogOpen(true)}>
        New Query Request
      </Button>
      <Dialog
        transition
        open={isDialogOpen}
        onClose={closeDialog}
        className="relative z-50 transition duration-300 ease-out data-closed:opacity-0"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="flex flex-col items-center max-w-lg w-1/2 max-h-4/5 overflow-y-auto space-y-4 border bg-white p-6 rounded-lg shadow-xl">
            <DialogTitle className="font-bold text-center">New Query Request</DialogTitle>

            <form onSubmit={submitNewQueryRequest}>
              <div>
                <span className="text-sm font-semibold px-4">Predicates ({predicateNum}/3)</span>
                <Button variant="outline" size="icon" onClick={incPredicate} className="mt-2">
                  <PlusIcon />
                </Button>
              </div>

              {[...Array(predicateNum).keys()].map((idx) => (
                <Predicate
                  key={`predicate-${idx}`}
                  questionSet={questionSet}
                  prefix={`predicate${idx}`}
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

function Predicate({ questionSet, prefix }: { questionSet: QuestionSet; prefix: string }) {
  const [selectedMeta, setSelectedMeta] = useState<QuestionSpec>();

  const metaChange = (ev: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(ev.target.value);
    setSelectedMeta(questionSet.metas[idx]);
  };

  const compareActions = ["= (eq)", "≠ (ne)", "≥ (gte)", "≤ (lte)"];

  const selectInputClasses = clsx(
    "mt-3 block w-full appearance-none rounded-lg border-none bg-black/5 px-3 py-1.5 text-sm/6 text-black",
    "focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-black/25",
    "*:text-black",
  );
  const textInputClasses = clsx(
    "mt-3 block w-full rounded-lg border-none bg-black/5 px-3 py-1.5 text-sm/6 text-black",
    "focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-black/25",
  );

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="relative">
        <Select
          className={selectInputClasses}
          name={`${prefix}-metaOpt`}
          onChange={metaChange}
          defaultValue=""
          required
        >
          <option value="" hidden></option>
          {questionSet.metas.map((meta, idx) => (
            <option key={idx} value={idx}>
              {meta.text}
            </option>
          ))}
        </Select>
        <ChevronDownIcon
          className="group pointer-events-none absolute top-5 right-2.5 size-4 fill-black/60"
          aria-hidden="true"
        />
      </div>
      <div className="relative">
        <Select className={selectInputClasses} name={`${prefix}-op`} defaultValue="" required>
          <option value="" hidden></option>
          {compareActions.map((action, idx) => (
            <option key={idx} value={idx}>
              {action}
            </option>
          ))}
        </Select>
        <ChevronDownIcon
          className="group pointer-events-none absolute top-5 right-2.5 size-4 fill-black/60"
          aria-hidden="true"
        />
      </div>
      {selectedMeta &&
        (selectedMeta.t === QuestionType.Option ? (
          <div className="relative">
            <Select
              className={selectInputClasses}
              name={`${prefix}-metaVal`}
              defaultValue=""
              required
            >
              <option value="" hidden></option>
              {selectedMeta.options.map((opt, idx) => (
                <option key={idx} value={idx}>
                  {opt}
                </option>
              ))}
            </Select>
            <ChevronDownIcon
              className="group pointer-events-none absolute top-5 right-2.5 size-4 fill-black/60"
              aria-hidden="true"
            />
          </div>
        ) : (
          <Input
            required
            name={`${prefix}-metaVal`}
            type="number"
            className={textInputClasses}
            placeholder={`${selectedMeta.min} - ${selectedMeta.max}`}
            min={selectedMeta.min}
            max={selectedMeta.max}
          />
        ))}
    </div>
  );
}
