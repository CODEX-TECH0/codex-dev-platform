import type {Key,Notice,Project,Task} from './types';
export const seedProjects:Project[]=[
{id:'p1',name:'Mirabel Desktop',framework:'Tauri + React',repository:'codex-tech/mirabel',environment:'Production',status:'Ready',updated:'2 minutes ago'},
{id:'p2',name:'WinNaija',framework:'Next.js',repository:'codex-tech/winnaija',environment:'Preview',status:'Building',updated:'18 minutes ago'},
{id:'p3',name:'StatusVault',framework:'Go',repository:'codex-tech/statusvault',environment:'Production',status:'Ready',updated:'1 hour ago'},
{id:'p4',name:'Codex Cloud',framework:'Node.js',repository:'codex-tech/cloud',environment:'Development',status:'Queued',updated:'3 hours ago'},
{id:'p5',name:'Developer Portal',framework:'Astro',repository:'codex-tech/developer-portal',environment:'Preview',status:'Failed',updated:'Yesterday'}];
export const seedTasks:Task[]=[{id:'t1',title:'Add regional deployment controls',status:'In Progress',priority:'High',assignee:'Avery',labels:['platform']},{id:'t2',title:'Review OAuth callback policy',status:'Review',priority:'Critical',assignee:'Maya',labels:['security']},{id:'t3',title:'Document edge cache API',status:'Todo',priority:'Medium',assignee:'Noah',labels:['docs']},{id:'t4',title:'Audit billing webhooks',status:'Backlog',priority:'Low',assignee:'Avery',labels:['ops']}];
export const seedKeys:Key[]=[{id:'k1',name:'Production CI',prefix:'ctx_live_••••7Q2M',created:'Aug 12, 2026',lastUsed:'2 minutes ago'},{id:'k2',name:'Local tooling',prefix:'ctx_test_••••MK8P',created:'Jul 30, 2026',lastUsed:'4 days ago'}];
export const seedNotices:Notice[]=[{id:'n1',title:'Deployment is live',detail:'Mirabel Desktop reached production.',read:false,kind:'success'},{id:'n2',title:'Security review due',detail:'Rotate your local tooling API key.',read:false,kind:'warning'},{id:'n3',title:'Maya joined the workspace',detail:'Developer access granted.',read:true,kind:'info'}];
