import { LearningProvider } from "./learning-context";

export default function LearningLayout({ children }: { children: React.ReactNode }) {
  return <LearningProvider>{children}</LearningProvider>;
}
