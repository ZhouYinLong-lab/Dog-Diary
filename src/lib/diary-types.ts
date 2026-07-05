export type DiaryEntry = {
  date: string;
  happened: string;
  thoughts: string;
  ideas: string;
  bodyLife: string;
  yesterdayPlan: string;
  tomorrow: string;
  tags: string[];
  mood: string;
  energy: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiSnapshot = {
  id: string;
  date: string;
  provider: "wakatime" | "weread";
  status: "empty" | "ready" | "error";
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type DailyPayload = {
  entry: DiaryEntry;
  snapshots: ApiSnapshot[];
};

export type DiaryUpdateInput = Pick<
  DiaryEntry,
  | "date"
  | "happened"
  | "thoughts"
  | "ideas"
  | "bodyLife"
  | "tomorrow"
  | "tags"
  | "mood"
  | "energy"
>;
