import { boards } from "./types";
import type { Board } from "./types";

export function BoardPicker({ value, onChange }: {
  value: Board[];
  onChange: (value: Board[]) => void;
}) {
  return (
    <div className="ds-board-field">
      <span>Board</span>
      <details className="ds-board-picker">
      <summary aria-label={`Board: ${value.length ? value.join(", ") : "Select boards"}`}>
        {value.length ? value.join(", ") : "Select boards"}
      </summary>
      <fieldset>
        <legend>Boards (select all that apply)</legend>
        {boards.map((board) => (
          <label key={board}>
            <input type="checkbox" checked={value.includes(board)} onChange={(e) =>
              onChange(boards.filter((item) => item === board ? e.target.checked : value.includes(item)))
            } />
            {board}
          </label>
        ))}
      </fieldset>
      </details>
    </div>
  );
}
