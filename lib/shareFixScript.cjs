/** Inline script — rewrite Railway share URLs before the app bundle loads. */
const PUBLIC_SHARE_SITE = 'https://www.wishtenter.com';

function shareFixInlineScript(site = PUBLIC_SHARE_SITE) {
  const safeSite = String(site).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `<script id="wishtenter-share-fix">(function(){var S='${safeSite}';var R=/^https?:\\/\\/[^/]+\\.railway\\.app(?:\\/share)?\\/([^/?#]+)(\\?wish=([^&]+))?/i;function t(u){if(!u||typeof u!=='string')return u;var m=u.match(R);if(!m)return u;var user=decodeURIComponent(m[1]);if(!user||/^(api|uploads|assets|share|admin|dashboard)$/i.test(user))return u;var o=S+'/'+encodeURIComponent(user);return m[3]?o+'?wish='+m[3]:o;}window.__wishtenterPublicUrl=function(u,w){var b=S+'/'+encodeURIComponent(u);return w?b+'?wish='+encodeURIComponent(w):b;};window.__wishtenterShareFix=t;if(navigator.clipboard&&navigator.clipboard.writeText){var w=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=function(x){return w(t(x));};}if(navigator.share){var sh=navigator.share.bind(navigator);navigator.share=function(d){if(d&&d.url)d=Object.assign({},d,{url:t(d.url)});return sh(d);};}document.addEventListener('copy',function(e){try{var dt=e.clipboardData;if(!dt)return;var sel=window.getSelection?String(window.getSelection()):'';if(!sel||!R.test(sel))return;e.preventDefault();dt.setData('text/plain',t(sel));}catch(_){}},true);})();</script>`;
}

function injectShareFixIntoHtml(html, site = PUBLIC_SHARE_SITE) {
  if (!html || html.includes('id="wishtenter-share-fix"')) return html;
  const script = shareFixInlineScript(site);
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${script}`);
  }
  return `${script}${html}`;
}

module.exports = {
  PUBLIC_SHARE_SITE,
  shareFixInlineScript,
  injectShareFixIntoHtml,
};
