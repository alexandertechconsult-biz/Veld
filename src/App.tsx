import { APP_NAME, APP_TAGLINE } from './appInfo';

/**
 * Placeholder shell. The real navigation and screens land in E0-04; this exists
 * so the toolchain has something real to boot, build, and test against.
 */
export default function App() {
  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p>{APP_TAGLINE}</p>
    </main>
  );
}
