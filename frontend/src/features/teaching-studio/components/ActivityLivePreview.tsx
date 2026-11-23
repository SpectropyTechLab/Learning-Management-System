import { useEffect, useMemo, useState } from 'react';
import type { ActivityDocument } from './activityBuilderModel';
import { applyActivityScore } from './activityScoring';
import ActivityScenePreview from './ActivityScenePreview';
import ActivityCrosswordPreview from './ActivityCrosswordPreview';
import ActivitySimulationPreview from './ActivitySimulationPreview';
import { BalloonPreview, HangmanPreview, MazePreview, WhackPreview, WordSearchPreview } from './ActivityPrototypeGames';

type Props = { activity: ActivityDocument };

const groupedTypes = new Set(['match', 'sort', 'order', 'wheel', 'label', 'sim', 'crossword', 'wordsearch', 'balloon']);
const splitRow = (row: string) => row.split('|').map((cell) => cell.trim());

export default function ActivityLivePreview({ activity }: Props) {
  const items = useMemo(() => {
    const lines = activity.content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return groupedTypes.has(activity.activityType) ? [lines] : lines;
  }, [activity.activityType, activity.content]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [complete, setComplete] = useState(false);
  const [activeTeam, setActiveTeam] = useState(0);
  const [teamScores, setTeamScores] = useState<number[]>([]);
  const [selectedLeft, setSelectedLeft] = useState('');
  const [matchLinks, setMatchLinks] = useState<Record<string, string>>({});
  const [selectedPoolItem, setSelectedPoolItem] = useState('');
  const [sortLinks, setSortLinks] = useState<Record<string, string>>({});
  const [orderedItems, setOrderedItems] = useState<string[]>([]);
  const [wheelResult, setWheelResult] = useState('');
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [labelPlacements, setLabelPlacements] = useState<Record<number, string>>({});
  const [draggedValue, setDraggedValue] = useState('');
  const teams = useMemo(() => activity.mode === 'Team vs Team'
    ? activity.teams.split(',').map((team) => team.trim()).filter(Boolean)
    : [], [activity.mode, activity.teams]);
  const labelRows = useMemo(() => activity.activityType === 'label'
    ? activity.content.split(/\r?\n/).map(splitRow).filter(([label]) => label)
    : [], [activity.activityType, activity.content]);

  useEffect(() => {
    setIndex((current) => Math.max(0, Math.min(current, Math.max(0, items.length - 1))));
    if (items.length) setComplete(false);
  }, [items.length]);
  useEffect(() => {
    setIndex(0); setScore(0); setAnswered(false); setSelected(''); setAnswerText(''); setRevealed(false); setComplete(false);
    setSelectedLeft(''); setMatchLinks({}); setSelectedPoolItem(''); setSortLinks({}); setOrderedItems([]); setWheelResult(''); setWheelRotation(0); setWheelSpinning(false);
    setSelectedLabel(''); setLabelPlacements({}); setDraggedValue('');
  }, [activity.activityType]);
  useEffect(() => setTeamScores((current) => teams.map((_, teamIndex) => current[teamIndex] || 0)), [teams]);

  const raw = items[index];
  const parts = Array.isArray(raw) ? raw.map(splitRow) : splitRow(raw || '');
  const mark = (choice: string, correct: boolean) => {
    if (answered) return;
    setAnswered(true);
    setSelected(choice);
    setScore((current) => applyActivityScore(current, correct, activity.points, activity.negativeMarks));
    if (teams.length) setTeamScores((current) => current.map((value, teamIndex) => teamIndex === activeTeam ? applyActivityScore(value, correct, activity.points, activity.negativeMarks) : value));
    if (activity.instantReveal) setRevealed(true);
  };
  const markGrouped = (correct: number, total: number) => {
    if (answered) return;
    const safeCorrect = Math.max(0, Math.min(total, correct));
    const change = safeCorrect * (Number(activity.points) || 0) - (total - safeCorrect) * Math.max(0, Number(activity.negativeMarks) || 0);
    setAnswered(true);
    setScore((current) => current + change);
    if (teams.length) setTeamScores((current) => current.map((value, teamIndex) => teamIndex === activeTeam ? value + change : value));
  };
  const scoreRepeated = (correct: boolean) => {
    setScore((current) => applyActivityScore(current, correct, activity.points, activity.negativeMarks));
    if (teams.length) setTeamScores((current) => current.map((value, teamIndex) => teamIndex === activeTeam ? applyActivityScore(value, correct, activity.points, activity.negativeMarks) : value));
  };
  const next = () => {
    if (groupedTypes.has(activity.activityType) && !revealed) { setRevealed(true); return; }
    if (activity.activityType === 'sim' && revealed && !answered) return;
    if (answered && !revealed) { setRevealed(true); return; }
    if (index < items.length - 1) {
      setIndex((current) => current + 1); setAnswered(false); setSelected(''); setAnswerText(''); setRevealed(false);
    } else setComplete(true);
  };

  const buttonClass = (choice = '') => `rounded-xl border p-3 text-left transition ${selected === choice ? 'border-amber-300 bg-amber-300/15' : 'border-white/15 bg-white/5 hover:border-white/35 hover:bg-white/10'}`;
  const renderContent = () => {
    if (!raw) return <p className="text-slate-400">Add content to begin.</p>;
    if (complete) {
      const usesPrototypeSplit = ['sim', 'crossword', 'wordsearch', 'hangman', 'whack', 'balloon', 'maze'].includes(activity.activityType);
      return <div className={usesPrototypeSplit ? 'ml-[42%] flex h-full min-h-0 flex-col justify-center border-l border-white/10 px-6 py-5' : ''}>
        <h2 className="text-3xl font-black">Activity complete</h2>
        <p className="mt-3 text-6xl font-black text-amber-300">{score} points</p>
        <p className="mt-2 text-slate-400">{activity.title}</p>
      </div>;
    }
    if (activity.activityType === 'ar' && !Array.isArray(parts[0])) {
      const row = parts as string[];
      const options = [
        'Both A and R are true, and R is the correct explanation of A',
        'Both A and R are true, but R is NOT the correct explanation of A',
        'A is true, but R is false',
        'A is false (R may be true or false)',
      ];
      const correctIndex = Math.max(0, 'ABCD'.indexOf((row[2] || 'A').toUpperCase()));
      return <><div className="grid gap-2 text-xl font-bold"><p><span className="text-amber-300">Assertion:</span> {row[0]}</p><p><span className="text-amber-300">Reason:</span> {row[1]}</p></div><div className="grid gap-2">{options.map((option, optionIndex) => { const revealedClass = revealed ? (optionIndex === correctIndex ? 'border-emerald-400 bg-emerald-400/15' : selected === option ? 'border-red-400 bg-red-400/15' : '') : ''; return <button key={option} type="button" onClick={() => mark(option, optionIndex === correctIndex)} className={`${buttonClass(option)} ${revealedClass}`}><b className={revealed && optionIndex === correctIndex ? 'text-emerald-300' : 'text-amber-300'}>{'ABCD'[optionIndex]}</b> &nbsp;{option}</button>; })}</div>{revealed ? <div className="rounded-lg border-l-4 border-emerald-400 bg-emerald-400/10 p-3">✓ {options[correctIndex]}{row[3] ? ` — ${row[3]}` : ''}</div> : null}</>;
    }
    if (['mcq', 'tf'].includes(activity.activityType) && !Array.isArray(parts[0])) {
      const row = parts as string[];
      const correct = activity.activityType === 'tf' ? (/^t/i.test(row[1]) ? 'True' : 'False') : row[1];
      const options = activity.activityType === 'tf' ? ['True', 'False'] : row.slice(1, 5).filter(Boolean);
      return <><h2 className="text-2xl font-black leading-tight">{row[0]}</h2><div className="grid grid-cols-2 gap-3">{options.map((option, optionIndex) => { const revealedClass = revealed ? (option === correct ? 'border-emerald-400 bg-emerald-400/15' : selected === option ? 'border-red-400 bg-red-400/15' : '') : ''; return <button key={`${option}-${optionIndex}`} type="button" onClick={() => mark(option, option === correct)} className={`${buttonClass(option)} ${revealedClass}`}><b className={revealed && option === correct ? 'text-emerald-300' : 'text-amber-300'}>{String.fromCharCode(65 + optionIndex)}</b> &nbsp;{option}</button>; })}</div>{revealed ? <div className="rounded-lg border-l-4 border-emerald-400 bg-emerald-400/10 p-3">✓ {correct}{row[5] ? ` — ${row[5]}` : ''}</div> : null}</>;
    }
    if (activity.activityType === 'numeric' && !Array.isArray(parts[0])) {
      const row = parts as string[];
      return <><h2 className="text-2xl font-black">{row[0]}</h2><input type="number" value={answerText} onChange={(event) => setAnswerText(event.target.value)} className="rounded-xl border border-white/20 bg-white/5 p-3 text-xl text-white outline-none" placeholder={`Answer${row[3] ? ` (${row[3]})` : ''}`} /><button type="button" onClick={() => { mark(answerText, Math.abs(Number(answerText) - Number(row[1])) <= (Number(row[2]) || 0)); setRevealed(true); }} className="rounded-xl p-3 font-black text-slate-950" style={{ background: activity.accent }}>Check answer</button>{revealed ? <div className="rounded-lg border-l-4 border-emerald-400 bg-emerald-400/10 p-3"><b>Answer: {row[1]} {row[3] || ''}</b>{row[4] ? <><br/>{row[4]}</> : null}</div> : null}</>;
    }
    if (activity.activityType === 'blanks' && typeof raw === 'string') {
      const answers = [...raw.matchAll(/\[(.+?)\]/g)].map((match) => match[1]);
      const checkBlanks = () => {
        const supplied = answerText.split(',').map((answer) => answer.trim().toLowerCase()).filter(Boolean);
        const expected = answers.map((answer) => answer.trim().toLowerCase());
        mark(answerText, supplied.length === expected.length && expected.every((answer, answerIndex) => supplied[answerIndex] === answer));
        setRevealed(true);
      };
      return <><h2 className="text-2xl font-black leading-relaxed">{raw.replace(/\[(.+?)\]/g, '_____')}</h2><input value={answerText} onChange={(event) => setAnswerText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') checkBlanks(); }} className="rounded-xl border border-white/20 bg-white/5 p-3 text-xl text-white outline-none" placeholder={answers.length > 1 ? 'Enter answers separated by commas' : 'Type the missing word'} /><p className="text-xs text-slate-400">Answers are not case-sensitive{answers.length > 1 ? ' · keep the same blank order' : ''}.</p><button type="button" onClick={checkBlanks} className="rounded-xl p-3 font-black text-slate-950" style={{ background: activity.accent }}>Check answers</button>{revealed ? <div className="rounded-lg border-l-4 border-emerald-400 bg-emerald-400/10 p-3"><b>Answer:</b> {answers.join(', ')}</div> : null}</>;
    }
    if (activity.activityType === 'flash' && !Array.isArray(parts[0])) {
      const row = parts as string[];
      return <div className="flex min-h-0 flex-1 items-center justify-center py-2"><div className="h-full max-h-[420px] min-h-[250px] max-w-full [aspect-ratio:3/4] [perspective:1200px]"><button type="button" onClick={() => setRevealed((current) => !current)} className="relative block h-full w-full bg-transparent text-left" aria-label={revealed ? 'Show flashcard front' : 'Reveal flashcard answer'}><span className="absolute inset-0 grid rounded-[28px] border-2 border-white/20 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 p-7 shadow-[0_24px_60px_rgba(0,0,0,.45)] transition-transform duration-500 [backface-visibility:hidden]" style={{ transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)' }}><span className="self-start text-center text-xs font-black uppercase tracking-[0.25em]" style={{ color: activity.accent }}>Question</span><strong className="place-self-center text-center text-2xl leading-snug">{row[0]}</strong><span className="self-end text-center text-xs text-slate-400">Tap card to reveal</span></span><span className="absolute inset-0 grid rounded-[28px] border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 p-7 shadow-[0_24px_60px_rgba(0,0,0,.45)] transition-transform duration-500 [backface-visibility:hidden]" style={{ transform: revealed ? 'rotateY(0deg)' : 'rotateY(-180deg)' }}><span className="self-start text-center text-xs font-black uppercase tracking-[0.25em] text-emerald-300">Answer</span><strong className="place-self-center text-center text-2xl leading-snug">{row[1]}</strong><span className="self-end text-center text-xs text-slate-400">Tap card to return</span></span></button></div></div>;
    }
    if (activity.activityType === 'anagram' && !Array.isArray(parts[0])) {
      const row = parts as string[];
      const scrambled = row[0].toUpperCase().split('').reverse();
      const checkAnagram = () => { mark(answerText, answerText.trim().toLowerCase() === row[0].toLowerCase()); setRevealed(true); };
      return <><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Unscramble the scientific term</p><div className="flex flex-wrap justify-center gap-2">{(revealed ? row[0].toUpperCase().split('') : scrambled).map((letter, letterIndex) => <span key={`${letter}-${letterIndex}`} className={`grid h-14 w-12 place-items-center rounded-xl border text-2xl font-black shadow-lg transition-all duration-300 ${revealed ? 'border-emerald-400 bg-emerald-400/15 text-emerald-200' : 'border-white/20 bg-white/10'}`}>{letter}</span>)}</div><p className="text-center text-slate-400"><b>Clue:</b> {row[1] || 'No clue provided'}</p><input value={answerText} onChange={(event) => setAnswerText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') checkAnagram(); }} className="rounded-xl border border-white/20 bg-white/5 p-3 text-center text-xl uppercase text-white outline-none" placeholder="Type the word" /><button type="button" onClick={checkAnagram} className="rounded-xl p-3 font-black text-slate-950" style={{ background: activity.accent }}>Check word</button>{revealed ? <div className="rounded-lg border-l-4 border-emerald-400 bg-emerald-400/10 p-3 text-emerald-200">Answer: {row[0]}</div> : null}</>;
    }
    if (activity.activityType === 'hangman' && !Array.isArray(parts[0])) {
      const row = parts as string[];
      return <HangmanPreview row={row} accent={activity.accent} revealed={revealed} onMark={(correct) => mark('hangman', correct)}/>;
    }
    if (activity.activityType === 'hotspot' && !Array.isArray(parts[0])) {
      const row = parts as string[];
      const choices = row[0].split(',').map((item) => item.trim()).filter(Boolean);
      const correct = row[1];
      return <><h2 className="text-2xl font-black">Which one is the odd one out?</h2><div className="grid grid-cols-2 gap-3">{choices.map((choice) => <button key={choice} type="button" onClick={() => mark(choice, choice === correct)} className={`${buttonClass(choice)} ${revealed ? (choice === correct ? 'border-emerald-400 bg-emerald-400/15' : selected === choice ? 'border-red-400 bg-red-400/15' : '') : ''}`}>{choice}</button>)}</div>{revealed ? <div className="rounded-lg border-l-4 border-emerald-400 bg-emerald-400/10 p-3">✓ {correct}{row[2] ? ` — ${row[2]}` : ''}</div> : null}</>;
    }
    if (activity.activityType === 'whack' && !Array.isArray(parts[0])) {
      const row = parts as string[];
      return <WhackPreview row={row} accent={activity.accent} duration={activity.timer || 30} revealed={revealed} onScore={scoreRepeated}/>;
    }
    if (activity.activityType === 'match' && Array.isArray(parts[0])) {
      const rows = parts as string[][];
      const usedMatches = new Set(Object.values(matchLinks));
      const assignMatch = (left: string, right: string) => setMatchLinks((current) => { const nextLinks = { ...current }; for (const key of Object.keys(nextLinks)) if (nextLinks[key] === right) delete nextLinks[key]; nextLinks[left] = right; return nextLinks; });
      return <><p className="text-slate-400">Click a left item and its match, or drag a right item onto an empty slot.</p><div className="grid gap-2">{rows.map(([left, right]) => { const linked = matchLinks[left]; const correct = linked === right; return <div key={left} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const value = event.dataTransfer.getData('text/plain') || draggedValue; if (value) assignMatch(left, value); setDraggedValue(''); }} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2"><button type="button" onClick={() => setSelectedLeft(left)} className={`rounded-xl border bg-white/5 p-3 text-left transition hover:bg-white/10 ${selectedLeft === left ? 'bg-white/10' : 'border-white/15'}`} style={selectedLeft === left ? { borderColor: activity.accent } : undefined}>{left}</button><span className="text-white/25">→</span><button type="button" onClick={() => setMatchLinks((current) => { const nextLinks = { ...current }; delete nextLinks[left]; return nextLinks; })} aria-label={linked ? `Remove match ${linked}` : `Empty match slot for ${left}`} className={`min-h-12 rounded-xl border border-dashed p-3 text-left transition ${revealed ? (correct ? 'border-emerald-400 bg-emerald-400/10 text-emerald-200' : 'border-red-400 bg-red-400/10') : linked ? 'border-white/25 bg-white/5 text-white' : 'border-white/15 bg-white/[0.025] text-white/20'}`}>{revealed ? right : linked || <span aria-hidden="true">&nbsp;</span>}</button></div>; })}</div>{!revealed ? <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-black/15 p-3">{rows.map(([, right]) => <button key={right} type="button" draggable={!usedMatches.has(right)} onDragStart={(event) => { setDraggedValue(right); event.dataTransfer.setData('text/plain', right); }} disabled={usedMatches.has(right)} onClick={() => { if (!selectedLeft) return; assignMatch(selectedLeft, right); setSelectedLeft(''); }} className="cursor-grab rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-white/40 hover:bg-white/15 active:cursor-grabbing disabled:opacity-25">{right}</button>)}</div> : <div className="text-emerald-300">{rows.filter(([left, right]) => matchLinks[left] === right).length} / {rows.length} matched correctly</div>}</>;
    }
    if (activity.activityType === 'sort' && Array.isArray(parts[0])) {
      const rows = parts as string[][];
      const groups = rows.map(([group]) => group);
      const pool = rows.flatMap(([, values]) => (values || '').split(',').map((item) => item.trim()).filter(Boolean));
      const correctGroup = Object.fromEntries(rows.flatMap(([group, values]) => (values || '').split(',').map((item) => [item.trim(), group])));
      const placeInGroup = (item: string, group: string) => { if (!item) return; setSortLinks((current) => ({ ...current, [item]: group })); setSelectedPoolItem(''); setDraggedValue(''); };
      return <><p className="text-slate-400">Click an item then its group, or drag each item into a group.</p><div className="flex flex-wrap gap-2">{pool.filter((item) => !sortLinks[item]).map((item) => <button key={item} type="button" draggable onDragStart={(event) => { setDraggedValue(item); event.dataTransfer.setData('text/plain', item); }} onClick={() => setSelectedPoolItem(item)} className={`${buttonClass()} cursor-grab active:cursor-grabbing ${selectedPoolItem === item ? 'border-amber-300' : ''}`}>{item}</button>)}</div><div className="grid grid-cols-2 gap-3">{groups.map((group) => <button key={group} type="button" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); placeInGroup(event.dataTransfer.getData('text/plain') || draggedValue, group); }} onClick={() => placeInGroup(selectedPoolItem, group)} className="min-h-24 rounded-xl border border-dashed border-white/25 p-3 text-left hover:border-amber-300"><b>{group}</b><div className="mt-2 flex flex-wrap gap-1">{pool.filter((item) => (revealed ? correctGroup[item] === group : sortLinks[item] === group)).map((item) => <span key={item} className={`rounded-lg border px-2 py-1 ${revealed && sortLinks[item] !== correctGroup[item] ? 'border-red-400' : 'border-white/20'}`}>{item}</span>)}</div></button>)}</div></>;
    }
    if (activity.activityType === 'order' && Array.isArray(raw)) {
      const correct = raw as string[];
      const sequence = orderedItems.length === correct.length ? orderedItems : [...correct].reverse();
      const move = (itemIndex: number, direction: -1 | 1) => { const nextItems = [...sequence]; const target = itemIndex + direction; if (target < 0 || target >= nextItems.length) return; [nextItems[itemIndex], nextItems[target]] = [nextItems[target], nextItems[itemIndex]]; setOrderedItems(nextItems); };
      return <><h2 className="text-2xl font-black">Put these in order</h2><p className="text-slate-400">Drag rows into position or use the arrow buttons.</p><div className="grid gap-2">{(revealed ? correct : sequence).map((item, itemIndex) => <div key={`${item}-${itemIndex}`} draggable={!revealed} onDragStart={(event) => { setDraggedValue(item); event.dataTransfer.setData('text/plain', item); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const dragged = event.dataTransfer.getData('text/plain') || draggedValue; const fromIndex = sequence.indexOf(dragged); if (fromIndex < 0 || fromIndex === itemIndex) return; const nextItems = [...sequence]; nextItems.splice(fromIndex, 1); nextItems.splice(itemIndex, 0, dragged); setOrderedItems(nextItems); setDraggedValue(''); }} className="flex cursor-grab items-center gap-2 active:cursor-grabbing"><b className="text-amber-300">{itemIndex + 1}</b><div className="flex-1 rounded-xl border border-white/15 bg-white/5 p-3">{item}</div>{!revealed ? <><button type="button" onClick={() => move(itemIndex, -1)}>▲</button><button type="button" onClick={() => move(itemIndex, 1)}>▼</button></> : null}</div>)}</div></>;
    }
    if (activity.activityType === 'wheel' && Array.isArray(raw)) {
      const segments = raw as string[];
      const slice = 360 / Math.max(1, segments.length);
      const palette = [activity.accent, '#6d28d9', '#0369a1', '#be185d', '#a16207', '#047857', '#b91c1c', '#4338ca'];
      const polarPoint = (angle: number, radius: number) => {
        const radians = (angle - 90) * Math.PI / 180;
        return { x: 200 + radius * Math.cos(radians), y: 200 + radius * Math.sin(radians) };
      };
      const segmentPath = (segmentIndex: number) => {
        const start = polarPoint(segmentIndex * slice, 178);
        const end = polarPoint((segmentIndex + 1) * slice, 178);
        return `M 200 200 L ${start.x} ${start.y} A 178 178 0 ${slice > 180 ? 1 : 0} 1 ${end.x} ${end.y} Z`;
      };
      const spinWheel = () => {
        if (wheelSpinning || !segments.length) return;
        const selectedIndex = Math.floor(Math.random() * segments.length);
        const selectedAngle = selectedIndex * slice + slice / 2;
        const nextRotation = Math.ceil(wheelRotation / 360) * 360 + 1440 + (360 - selectedAngle);
        setWheelResult(''); setWheelSpinning(true); setWheelRotation(nextRotation);
        window.setTimeout(() => { setWheelResult(segments[selectedIndex]); setWheelSpinning(false); }, 1250);
      };
      return <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2"><h2 className="text-xl font-black">Spin the wheel</h2><div className="relative aspect-square h-[min(76%,390px)] min-h-60 drop-shadow-[0_20px_35px_rgba(0,0,0,.5)]"><div className="absolute left-1/2 top-[-2px] z-20 -translate-x-1/2"><div className="h-0 w-0 border-x-[17px] border-t-[30px] border-x-transparent border-t-amber-300 drop-shadow-[0_4px_2px_rgba(0,0,0,.6)]"/></div><svg viewBox="0 0 400 400" role="img" aria-label="Spin wheel" className="h-full w-full overflow-visible"><circle cx="200" cy="200" r="196" fill="#e2e8f0" stroke="#475569" strokeWidth="5"/><circle cx="200" cy="200" r="184" fill="#0f172a" stroke="#ffffff" strokeOpacity=".45" strokeWidth="3"/><g style={{ transform: `rotate(${wheelRotation}deg)`, transformOrigin: '200px 200px', transition: 'transform 1200ms cubic-bezier(.12,.72,.18,1)' }}>{segments.map((segment, segmentIndex) => { const middleAngle = segmentIndex * slice + slice / 2; const labelPoint = polarPoint(middleAngle, segments.length > 10 ? 112 : 108); const radialRotation = middleAngle > 90 && middleAngle < 270 ? middleAngle - 90 : middleAngle + 90; const shortLabel = segment.length > 17 ? `${segment.slice(0, 15)}…` : segment; return <g key={`${segment}-${segmentIndex}`}><path d={segmentPath(segmentIndex)} fill={palette[segmentIndex % palette.length]} stroke="#fff" strokeOpacity=".65" strokeWidth="2"/><text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${radialRotation} ${labelPoint.x} ${labelPoint.y})`} fill="#fff" fontSize={segments.length > 10 ? 9 : segments.length > 7 ? 10 : 12} fontWeight="900" letterSpacing=".2" style={{ paintOrder: 'stroke', stroke: 'rgba(2,6,23,.9)', strokeWidth: 3.5, strokeLinejoin: 'round' }}><title>{segment}</title>{shortLabel}</text></g>; })}</g><circle cx="200" cy="200" r="30" fill="#0f172a" stroke="#fff" strokeWidth="6"/><circle cx="200" cy="200" r="10" fill="#fbbf24"/></svg></div><button type="button" disabled={wheelSpinning} onClick={spinWheel} className="rounded-xl border border-white/20 px-7 py-2.5 text-sm font-black text-slate-950 shadow-lg transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60" style={{ background: activity.accent }}>{wheelSpinning ? 'Spinning…' : 'SPIN'}</button><div className="min-h-7 max-w-full truncate px-3 text-center text-lg font-black text-amber-300">{wheelResult ? `→ ${wheelResult}` : `${segments.length} segments`}</div></div>;
    }
    if (activity.activityType === 'balloon' && Array.isArray(parts[0])) {
      const rows = parts as string[][];
      return <BalloonPreview rows={rows} accent={activity.accent} revealed={revealed} onScore={scoreRepeated}/>;
    }
    if (activity.activityType === 'label' && Array.isArray(parts[0])) {
      const rows = parts as string[][];
      const placed = new Set(Object.values(labelPlacements));
      return <><p className="text-slate-400">Choose a label, then click its numbered pin on the scene.</p><div className="flex flex-wrap gap-2">{rows.map(([label]) => <button key={label} type="button" disabled={placed.has(label)} onClick={() => setSelectedLabel(label)} className={`${buttonClass()} ${selectedLabel === label ? 'border-amber-300' : ''} disabled:opacity-30`}>{label}</button>)}</div>{revealed ? <div className="text-emerald-300">{rows.filter(([label], pinIndex) => labelPlacements[pinIndex] === label).length} / {rows.length} labels correctly placed</div> : null}</>;
    }
    if (activity.activityType === 'sim' && Array.isArray(parts[0])) {
      const rows = parts as string[][];
      return <ActivitySimulationPreview activity={activity} question={rows[0]?.[0] || ''} answer={rows[0]?.[1] || ''} revealed={revealed} marked={answered} onMark={(correct) => mark('simulation', correct)}/>;
    }
    if (activity.activityType === 'crossword' && Array.isArray(parts[0])) {
      const rows = parts as string[][];
      return <ActivityCrosswordPreview rows={rows} accent={activity.accent} revealed={revealed} onResult={markGrouped}/>;
    }
    if (activity.activityType === 'wordsearch' && Array.isArray(parts[0])) {
      const rows = parts as string[][];
      return <WordSearchPreview rows={rows} accent={activity.accent} revealed={revealed} onResult={markGrouped}/>;
    }
    if (activity.activityType === 'maze' && !Array.isArray(parts[0])) {
      const row = parts as string[];
      return <MazePreview row={row} accent={activity.accent} revealed={revealed} onMark={(correct) => { mark('maze', correct); if (correct) setRevealed(true); }}/>;
    }
    const rows = Array.isArray(parts[0]) ? parts as string[][] : [parts as string[]];
    const heading: Record<string, string> = { match: 'Match the pairs', balloon: 'Match the pairs', sort: 'Sort into groups', order: 'Put these in order', wheel: 'Spin the wheel', label: 'Label the scene', sim: rows[0]?.[0] || 'Predict and observe', crossword: 'Crossword clues', wordsearch: 'Find these words', hotspot: 'Find the odd one out', whack: (parts as string[])[0] || 'Choose the correct answer' };
    return <><h2 className="text-2xl font-black">{heading[activity.activityType] || String(Array.isArray(raw) ? raw[0] || '' : raw)}</h2><div className="grid gap-2">{rows.map((row, rowIndex) => <div key={rowIndex} className="rounded-xl border border-white/15 bg-white/5 p-3"><b>{row[0]}</b>{row[1] ? <span className="text-slate-400"> — {row[1]}</span> : null}</div>)}</div>{activity.activityType === 'sim' ? <input type="range" className="w-full" style={{ accentColor: activity.accent }} /> : null}</>;
  };

  const overlaysScene = ['sim', 'crossword', 'wordsearch', 'hangman', 'whack', 'balloon', 'maze'].includes(activity.activityType);

  return (
    <div className="flex aspect-video w-full max-w-full flex-col overflow-hidden rounded-xl bg-[#0d1016] text-white shadow-xl" style={{ '--activity-accent': activity.accent } as React.CSSProperties}>
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-white/10 px-4 text-xs"><b className="uppercase" style={{ color: activity.accent }}>{activity.subject}</b><span className="truncate font-bold">{activity.title}</span><span className="flex-1"/><span>{activity.grade} · {activity.difficulty}</span></header>
      <div className={overlaysScene ? 'relative min-h-0 flex-1 overflow-hidden' : `grid min-h-0 flex-1 ${activity.layout === 'split' ? 'grid-cols-[42%_58%]' : 'grid-cols-1'}`}>
        {overlaysScene || activity.layout !== 'activity' ? <div className={overlaysScene ? 'absolute bottom-0 left-0 top-0 w-[42%] overflow-hidden opacity-30' : 'relative min-h-0 overflow-hidden border-r border-white/10 bg-[#0d0e10]'}><ActivityScenePreview {...activity} fullPane />{activity.activityType === 'label' ? <div className="absolute inset-0">{labelRows.map(([label, x, y], pinIndex) => { const placed = labelPlacements[pinIndex]; return <button key={`${label}-${pinIndex}`} type="button" onClick={() => { if (selectedLabel) { setLabelPlacements((current) => ({ ...current, [pinIndex]: selectedLabel })); setSelectedLabel(''); } else setLabelPlacements((current) => { const nextPlacements = { ...current }; delete nextPlacements[pinIndex]; return nextPlacements; }); }} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${Number(x) || 50}%`, top: `${Number(y) || 50}%` }}><span className="grid h-7 w-7 place-items-center rounded-full font-black text-slate-950" style={{ background: activity.accent }}>{pinIndex + 1}</span>{placed || revealed ? <span className={`mt-1 rounded-lg border bg-slate-950/90 px-2 py-1 text-[10px] ${revealed && placed !== label ? 'border-red-400' : 'border-white/20'}`}>{revealed ? label : placed}</span> : null}</button>; })}</div> : null}</div> : null}
        {overlaysScene || activity.layout !== 'wide' ? <div className={overlaysScene ? 'absolute inset-0 z-10 min-h-0 overflow-hidden' : 'flex min-h-0 flex-col gap-4 overflow-auto p-[5%]'}>{renderContent()}</div> : null}
      </div>
      <footer className="flex h-14 shrink-0 items-center gap-3 border-t border-white/10 px-4 text-xs">
        <span>{items.length > 1 && !complete ? `Item ${index + 1} / ${items.length}` : complete ? 'Complete' : ''}</span><span className="flex-1"/>
        {teams.length ? <select value={activeTeam} onChange={(event) => setActiveTeam(Number(event.target.value))} className="rounded bg-slate-800 p-1">{teams.map((team, teamIndex) => <option key={team} value={teamIndex}>{team} {teamScores[teamIndex] || 0}</option>)}</select> : <b className="text-amber-300">Score {score}</b>}
        {activity.layout !== 'wide' && !complete ? <button type="button" onClick={next} disabled={activity.activityType === 'sim' && revealed && !answered} className="rounded-lg px-4 py-2 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50" style={{ background: activity.accent }}>{activity.activityType === 'sim' && revealed && !answered ? 'Mark first' : answered && !revealed ? 'Reveal' : index === items.length - 1 ? 'Finish' : 'Next'}</button> : null}
      </footer>
    </div>
  );
}
