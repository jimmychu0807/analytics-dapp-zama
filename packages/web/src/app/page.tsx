import { MessageCircleQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <div className="pt-8">
        <Button variant="outline" size="lg">
          <MessageCircleQuestion/>
          New Question
        </Button>
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
