export type GitHubSnapshot={repo:{full_name:string;html_url:string;pushed_at:string;visibility:string};commit:{sha:string;html_url:string;commit:{message:string;committer:{date:string}}};deployments:Array<{id:number;ref:string;environment:string;created_at:string}>;fetchedAt:string;cacheStatus:'live'|'fresh'|'stale'};
const cacheKey='shadowtm-github-snapshot-v1';
const ttl=15*60*1000;
function cached():GitHubSnapshot|null{try{return JSON.parse(localStorage.getItem(cacheKey)||'null')}catch{return null}}
async function request(url:string,headers:Record<string,string>){for(let attempt=0;attempt<2;attempt++){const controller=new AbortController();const timer=window.setTimeout(()=>controller.abort(),8000);try{const response=await fetch(url,{headers,signal:controller.signal});clearTimeout(timer);if(response.ok)return response;if(response.status===403)throw new Error('GitHub free API rate limit reached');if(attempt===1)throw new Error('GitHub public API is unavailable')}catch(error){clearTimeout(timer);if(attempt===1)throw error}}throw new Error('GitHub public API is unavailable')}
export async function getGitHubSnapshot(force=false):Promise<GitHubSnapshot>{
 const previous=cached();
 if(!force&&previous&&Date.now()-new Date(previous.fetchedAt).getTime()<ttl)return {...previous,cacheStatus:'fresh'};
 const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 const repository=window.location.pathname.startsWith('/ShadowTm')?'ShadowTm':'Open-';
 const base=`https://api.github.com/repos/alixbot85-source/${repository}`;
 try{
  const [repoResponse,commitResponse,deployResponse]=await Promise.all([request(base,headers),request(`${base}/commits/${encodeURIComponent('arena/01a0e41d-open')}`,headers),request(`${base}/deployments?per_page=5`,headers)]);
  const snapshot:GitHubSnapshot={repo:await repoResponse.json(),commit:await commitResponse.json(),deployments:await deployResponse.json(),fetchedAt:new Date().toISOString(),cacheStatus:'live'};
  localStorage.setItem(cacheKey,JSON.stringify(snapshot));return snapshot;
 }catch(error){if(previous)return {...previous,cacheStatus:'stale'};throw error}
}
