import { readNight, statusCounts } from '../digest/types.js';
import type { Status } from '../status.js';

export function StatusBoard({ status, runsDir }: { status: Status; runsDir: string }) {
  return (
    <>
      <h1>status</h1>
      <table>
        <tbody>
          <tr><th>adapter</th><td>{status.adapter}</td></tr>
          <tr><th>installed</th><td>{status.installed}</td></tr>
          <tr>
            <th>last beat</th>
            <td>{status.lastBeat ? `${status.lastBeat.at} · pid ${status.lastBeat.pid}` : <span class="warn">none</span>}</td>
          </tr>
        </tbody>
      </table>
      <h2>nights on disk</h2>
      {status.nights.length === 0 ? (
        <p class="mute">nothing in runs/</p>
      ) : (
        <ul>
          {status.nights.map((night) => {
            const digest = readNight(runsDir, night);
            const counts = statusCounts(digest?.rows ?? []);
            return (
              <li>
                <a href={`/digest/${night}`}>{night}</a>
                {' '}
                <span>{counts.ok} ok / {counts.retry} retry / {counts.fail} fail</span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
