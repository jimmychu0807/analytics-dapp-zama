export enum QuestionType {
  Option,
  Value,
}

export enum PredicateOp {
  EQ,
  NE,
  GT,
  LT,
}

export enum QuestionState {
  Initialized,
  Open,
  Closed,
}

export enum RequestState {
  Initialized,
  Completed,
}

export type Predicate = {
  metaOpt: number;
  op: number;
  metaVal: number;
};

export type QueryRequest = {
  id: bigint;
  qId: bigint;
  accSteps: number;
  state: RequestState;
};

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
