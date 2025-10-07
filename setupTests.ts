import '@testing-library/jest-dom';
import 'whatwg-fetch';

// Silence Next.js router warnings in tests
jest.mock('next/router', () => ({
  __esModule: true,
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));
