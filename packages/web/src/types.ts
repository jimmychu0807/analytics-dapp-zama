export enum QuestionType {
  Option,
  Value,
}

export type QuestionSpec = {
  text: string;
  options: string[];
  min: number;
  max: number;
  t: QuestionType;
};
