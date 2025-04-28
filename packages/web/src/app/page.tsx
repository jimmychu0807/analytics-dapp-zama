import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import NewQuestionDialog from "@/components/NewQuestionDialog"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <div className="py-4">
        <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">Analytics dApp</h4>
        <p className="text-muted-foreground text-center">built on Zama</p>
      </div>

      <div>
        <NewQuestionDialog/>
      </div>

      <div className="self-start px-6">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>
            Some content here
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button>Okay</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
