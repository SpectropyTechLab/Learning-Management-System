import type { QuestionFilters } from '../types';

type Props = {
  filters: QuestionFilters;
  subjects: Array<{ id: number; name: string }>;
  chapters: Array<{ id: number; name: string }>;
  topics: Array<{ id: number; name: string }>;
  onChange: (next: QuestionFilters) => void;
  onReset: () => void;
};

export default function FilterSidebar({ filters, subjects, chapters, topics, onChange, onReset }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">Filters</h3>

      <div className="mt-4 space-y-4 text-sm">
        <div>
          <label className="block text-xs font-semibold text-gray-500">Search</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Search question text..."
            value={filters.q || ''}
            onChange={(e) => onChange({ ...filters, q: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500">Subject</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={filters.subject_id || ''}
            onChange={(e) => onChange({ ...filters, subject_id: e.target.value, chapter_id: '', topic_id: '' })}
          >
            <option value="">All</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500">Chapter</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={filters.chapter_id || ''}
            onChange={(e) => onChange({ ...filters, chapter_id: e.target.value, topic_id: '' })}
            disabled={!filters.subject_id}
          >
            <option value="">All</option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500">Topic</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={filters.topic_id || ''}
            onChange={(e) => onChange({ ...filters, topic_id: e.target.value })}
            disabled={!filters.chapter_id}
          >
            <option value="">All</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500">Question Type</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={filters.question_type || ''}
            onChange={(e) => onChange({ ...filters, question_type: e.target.value as QuestionFilters['question_type'] })}
          >
            <option value="">All</option>
            <option value="mcq_single">MCQ (Single)</option>
            <option value="assertion_reasoning">Assertion Reasoning</option>
            <option value="mcq_multiple">MCQ (Multiple)</option>
            <option value="true_false">True/False</option>
            <option value="numerical">Numerical</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500">Difficulty</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={filters.difficulty_level || ''}
            onChange={(e) => onChange({ ...filters, difficulty_level: e.target.value as QuestionFilters['difficulty_level'] })}
          >
            <option value="">All</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500">Status</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={filters.status || ''}
            onChange={(e) => onChange({ ...filters, status: e.target.value as QuestionFilters['status'] })}
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500">Created By (User ID)</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="e.g. 21"
            value={filters.created_by || ''}
            onChange={(e) => onChange({ ...filters, created_by: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500">School ID</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="e.g. 3"
            value={filters.school_id || ''}
            onChange={(e) => onChange({ ...filters, school_id: e.target.value })}
          />
        </div>
      </div>

      <button
        className="mt-6 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        onClick={onReset}
      >
        Reset Filters
      </button>
    </div>
  );
}
