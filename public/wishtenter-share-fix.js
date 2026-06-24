/**
 * Patches clipboard + Web Share so copied links always use wishtenter.com.
 * Loaded from index.html before the app bundle (also served from Railway for hotfix).
 */
(function () {
  var SITE = 'https://www.wishtenter.com';
  var R = /^https?:\/\/[^/]+\.railway\.app(?:\/share)?\/([^/?#]+)(\?wish=([^&]+))?/i;

  function toPublicShareUrl(url) {
    if (!url || typeof url !== 'string') return url;
    var m = url.match(R);
    if (!m) return url;
    var user = decodeURIComponent(m[1]);
    if (!user || /^(api|uploads|assets|share|admin|dashboard)$/i.test(user)) return url;
    var out = SITE + '/' + encodeURIComponent(user);
    return m[3] ? out + '?wish=' + m[3] : out;
  }

  window.__wishtenterPublicUrl = function (username, wishId) {
    var base = SITE + '/' + encodeURIComponent(username);
    return wishId ? base + '?wish=' + encodeURIComponent(wishId) : base;
  };
  window.__wishtenterShareFix = toPublicShareUrl;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    var writeText = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = function (text) {
      return writeText(toPublicShareUrl(text));
    };
  }

  if (navigator.share) {
    var share = navigator.share.bind(navigator);
    navigator.share = function (data) {
      if (data && data.url) {
        data = Object.assign({}, data, { url: toPublicShareUrl(data.url) });
      }
      return share(data);
    };
  }

  document.addEventListener(
    'copy',
    function (e) {
      try {
        var dt = e.clipboardData;
        if (!dt) return;
        var sel = window.getSelection ? String(window.getSelection()) : '';
        if (!sel || !R.test(sel)) return;
        e.preventDefault();
        dt.setData('text/plain', toPublicShareUrl(sel));
      } catch (_) {
        /* ignore */
      }
    },
    true
  );
})();
