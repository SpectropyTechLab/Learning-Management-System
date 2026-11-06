import api from '@/lib/api';
import type { PublishedResourceMapping } from './studioPublishedApi';

export type StudioDiscoveryType = 'session' | 'screen' | 'resource';

export interface StudioDiscoveryFilters {
  topicId?: number | null;
  subtopicId?: number | null;
  tags?: string;
  pedagogy?: string;
  bloom?: string;
  search?: string;
}

export interface StudioDiscoveryCurriculum {
  board_id: number;
  board_name: string;
  program_id: number;
  program_name: string;
  grade_id: number;
  grade_number: number;
  subject_id: number;
  subject_name: string;
  chapter_id: number;
  chapter_number: number;
  chapter_name: string;
  topic_id: number;
  topic_name: string;
  subtopic_id: number;
  subtopic_name: string;
}

export interface StudioDiscoveryItem {
  key: string;
  type: StudioDiscoveryType;
  title: string;
  description: string | null;
  release_id: number;
  release_number: number;
  session_id: number;
  screen_id?: number;
  screen_number?: number;
  screen_count?: number;
  resource_id?: number;
  resource_version_id?: number;
  resource_type?: string;
  resource_mapping?: PublishedResourceMapping;
  tags: string[];
  curriculum: StudioDiscoveryCurriculum;
}

export interface StudioDiscoveryResponse {
  type: StudioDiscoveryType;
  items: StudioDiscoveryItem[];
  next_cursor: string | null;
  applied_context: StudioDiscoveryCurriculum;
  facets: {
    topics: Array<{ id: number; name: string }>;
    subtopics: Array<{ id: number; topic_id: number; name: string }>;
  };
}

export const discoverStudioContent = async (
  releaseId: number,
  screenId: number,
  type: StudioDiscoveryType,
  filters: StudioDiscoveryFilters,
  cursor?: string | null,
) => {
  const response = await api.get<{ data: StudioDiscoveryResponse }>('/studio/discovery', {
    params: {
      release_id: releaseId,
      screen_id: screenId,
      type,
      topic_id: filters.topicId || undefined,
      subtopic_id: filters.subtopicId || undefined,
      tags: filters.tags?.trim() || undefined,
      pedagogy: filters.pedagogy?.trim() || undefined,
      bloom: filters.bloom?.trim() || undefined,
      search: filters.search?.trim() || undefined,
      limit: 20,
      cursor: cursor || undefined,
    },
  });
  return response.data.data;
};
