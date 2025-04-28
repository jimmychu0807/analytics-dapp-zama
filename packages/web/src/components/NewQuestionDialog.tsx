'use client';

import { MessageCircleQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function NewQuestionDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg">
          <MessageCircleQuestion/>
          New Question
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a New Question</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <Button>Create Question</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
