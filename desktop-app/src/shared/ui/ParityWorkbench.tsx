import { Panel } from './Panel';

export function ParityWorkbench({
  title,
  summary,
  implemented,
  next
}: {
  title: string;
  summary: string;
  implemented: string[];
  next: string[];
}) {
  return (
    <section className="parity-workbench">
      <Panel className="parity-hero">
        <span className="eyebrow">스프레드시트 동일화</span>
        <h2>{title}</h2>
        <p>{summary}</p>
      </Panel>
      <Panel className="parity-card">
        <h2>현재 연결됨</h2>
        <ul className="todo-list">
          {implemented.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </Panel>
      <Panel className="parity-card">
        <h2>다음 구현</h2>
        <ul className="todo-list">
          {next.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </Panel>
    </section>
  );
}
