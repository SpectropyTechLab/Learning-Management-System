import 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Existing OS interceptor flag for login/logout and refresh requests. */
    _skipAuthRefresh?: boolean;
  }
}
