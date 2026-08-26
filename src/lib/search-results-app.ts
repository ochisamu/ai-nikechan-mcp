export const searchResultsAppUri = "ui://ai-nikechan/search-results.html";

export const searchResultsAppHtml = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  :root{color:#182033;background:#fff;font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","Hiragino Sans",system-ui,sans-serif}
  *{box-sizing:border-box}
  body{margin:0;padding:14px;background:#fff}
  .summary{margin:0 2px 12px;color:#667085;font-size:12px;font-weight:650}
  .cards{display:grid;gap:12px}
  .card{overflow:hidden;border:1px solid #e1e6ef;border-radius:16px;background:#fff;box-shadow:0 5px 18px rgba(24,32,51,.035)}
  .preview:empty{display:none}
  .preview-media{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;background:linear-gradient(145deg,#f1f3f8,#e9edf5)}
  .preview-image{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:contain;object-position:center}
  .preview-copy{padding:12px 14px 0}
  .preview-title{display:block;color:#172033;font-size:14px;line-height:1.45;letter-spacing:-.01em}
  .preview-description{display:-webkit-box;margin:6px 0 0;overflow:hidden;color:#505a6b;font-size:13px;line-height:1.6;-webkit-box-orient:vertical;-webkit-line-clamp:3}
  .card-body{padding:12px 14px 14px}
  .preview:not(:empty)+.card-body{padding-top:10px}
  .meta{display:flex;gap:7px;flex-wrap:wrap;align-items:center;color:#697386;font-size:11px}
  .tag{padding:2px 8px;border-radius:999px;background:#f1f4f8;color:#536176}
  .text{display:-webkit-box;margin:10px 0;overflow:hidden;color:#252d3d;font-size:13px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere;-webkit-box-orient:vertical;-webkit-line-clamp:7}
  .link{display:inline-flex;min-height:36px;align-items:center;color:#1769aa;font-size:13px;font-weight:700;text-decoration:none}
  .link::after{content:"↗";margin-left:5px;font-size:11px}
  .link:focus-visible{outline:2px solid #1769aa;outline-offset:3px;border-radius:4px}
  .empty{color:#667085}
  @media(max-width:520px){body{padding:10px}.cards{gap:10px}.card{border-radius:14px}.preview-media{aspect-ratio:4/3}.preview-copy{padding:10px 12px 0}.card-body{padding:10px 12px 12px}.text{-webkit-line-clamp:6}}
  @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
  @media(prefers-contrast:more){.card{border-color:#667085}.meta,.summary{color:#3f4857}}
</style></head><body><p class="summary" id="summary">検索結果を読み込み中です…</p><main class="cards" id="cards"></main>
<script>
  const summary=document.getElementById('summary'),cards=document.getElementById('cards');
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const withoutUrls=value=>String(value??'').replace(/https?:\\/\\/\\S+/gi,'').replace(/[ \\t]+\\n/g,'\\n').trim();
  const normalize=value=>withoutUrls(value).toLocaleLowerCase('ja').replace(/[^\\p{L}\\p{N}]+/gu,' ').trim();
  const repeats=(left,right)=>{const a=normalize(left),b=normalize(right);if(!a||!b||Math.min(a.length,b.length)<5)return false;return a===b||a.includes(b)||b.includes(a)};
  const bodyWithoutTitle=(body,title)=>withoutUrls(body).split('\\n').filter(line=>!repeats(line,title)).join('\\n').replace(/\\n{3,}/g,'\\n\\n').trim();
  const imageMarkup=image=>image?'<div class="preview-media"><img class="preview-image" src="'+escape(image)+'" alt="" loading="lazy" decoding="async" /></div>':'';
  function previewMarkup(post,data={}){
    const image=post.previewImage||data.image;
    const title=post.previewTitle||data.title||'';
    let description=post.previewDescription||data.description||'';
    const body=bodyWithoutTitle(post.text,title);
    if(repeats(description,body)||repeats(description,title))description='';
    const copy=title||description?'<div class="preview-copy">'+(title?'<strong class="preview-title">'+escape(title)+'</strong>':'')+(description?'<p class="preview-description">'+escape(description)+'</p>':'')+'</div>':'';
    return imageMarkup(image)+copy;
  }
  const previewEndpoint='https://ai-nikechan-mcp.vercel.app/api/preview?url=';
  async function loadPreview(post,card){
    if(post.previewImage)return;
    try{
      const data=await fetch(previewEndpoint+encodeURIComponent(post.url)).then(response=>response.ok?response.json():null);
      if(!data)return;
      card.querySelector('.preview').innerHTML=previewMarkup(post,data);
    }catch{}
  }
  function cardMarkup(post,score,scoreLabel){
    const title=post.previewTitle||'';
    const body=bodyWithoutTitle(post.text,title);
    const scoreText=scoreLabel||(Number.isFinite(Number(score))?'関連度 '+Number(score).toFixed(2):'');
    return '<article class="card"><div class="preview">'+previewMarkup(post)+'</div><div class="card-body"><div class="meta"><span class="tag">'+escape(post.collection)+'</span><span>'+escape(post.createdAt?.slice(0,10)??'')+'</span>'+(scoreText?'<span>'+escape(scoreText)+'</span>':'')+'</div>'+(body?'<p class="text">'+escape(body)+'</p>':'')+'<a class="link" href="'+escape(post.url)+'" target="_blank" rel="noreferrer">元の投稿・ページを見る</a></div></article>';
  }
  function render(payload){
    const results=payload?.results??payload?.structuredContent?.results??[];
    summary.textContent=results.length?results.length+'件の検索結果':'該当する結果はありません。';
    cards.innerHTML=results.map(({post,score,scoreLabel})=>cardMarkup(post,score,scoreLabel)).join('')||'<p class="empty">結果がありません。</p>';
    results.forEach(({post},index)=>loadPreview(post,cards.children[index]));
  }
  render(window.openai?.toolOutput??window.mcp?.toolOutput);
  window.addEventListener('message',event=>render(event.data?.params?.structuredContent??event.data?.structuredContent??event.data?.toolOutput));
</script></body></html>`;
