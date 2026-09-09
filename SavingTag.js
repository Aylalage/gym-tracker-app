export default function SavingTag({ state }) {
  if (!state) return null;
  const text = state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : 'Save failed';
  return <div className="saving-tag">{text}</div>;
}
