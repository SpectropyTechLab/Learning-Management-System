import axios from 'axios';
import { resolveApiBaseUrl } from './apiBaseUrl';

// Public requests must not trigger the authenticated API client's login redirect.
const publicApi = axios.create({
  baseURL: `${resolveApiBaseUrl()}/api`,
});

export default publicApi;
