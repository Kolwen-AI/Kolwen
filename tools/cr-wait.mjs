import { githubToken } from './github-token.mjs';
const [pr, maxS = '480'] = process.argv.slice(2);
const tok = githubToken('GITHUB_READ_TOKEN');
const h = { Authorization: `Bearer ${tok}`, Accept: 'application/vnd.github+json' };
const g = async p => (await fetch(`https://api.github.com/repos/TheColliery/Kolwen/${p}`, { headers: h })).json();
const end = Date.now() + Number(maxS) * 1000;
for (;;) {
  const ic = await g(`issues/${pr}/comments`);
  const cr = ic.find(c => /coderabbit/.test(c.user.login));
  const busy = !cr || /Currently processing/.test(cr.body);
  if (!busy || Date.now() > end) {
    const rv = await g(`pulls/${pr}/reviews`); const inl = await g(`pulls/${pr}/comments`);
    console.log('busy', busy, 'reviews', rv.length, 'inline', inl.length);
    for (const r of rv) console.log('R', r.user.login, r.state, r.body.replace(/<[^>]+>/g, '').replace(/\n+/g, ' ').slice(0, 400));
    for (const c of inl) console.log('I', c.id, c.path + ':' + (c.line ?? c.original_line), c.body.replace(/\n+/g, ' ').slice(0, 300));
    if (cr) console.log('S', cr.body.replace(/<[^>]+>/g, '').replace(/\n+/g, ' ').match(/(No actionable comments[^.]*|Actionable comments posted: \d+)/)?.[0] ?? '');
    break;
  }
  await new Promise(r => setTimeout(r, 20000));
}
