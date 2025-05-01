import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { WalletConnect } from "@/components/WalletConnect";
import { NewQuestionDialog } from "@/components/NewQuestionDialog";
import { REQUIRED_CHAIN_ID } from "@/utils";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <div>
        <WalletConnect requiredChainId={REQUIRED_CHAIN_ID} />
      </div>
      <div>
        <NewQuestionDialog />
      </div>

      <div className="self-start px-6">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>Some content here</CardContent>
          <CardFooter className="flex justify-between">
            <Button>Okay</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
