export enum QuestionType {
  Option,
  Value,
}

export enum QuestionState {
  Initialized,
  Open,
  Closed,
}

export type QuestionSpec = {
  text: string;
  options: string[];
  min: number;
  max: number;
  t: QuestionType;
};

export type QuestionSet = {
  main: QuestionSpec;
  metas: QuestionSpec[];
  queryThreshold: number;
  startTime: number;
  endTime: number;
  state: QuestionState;
};
