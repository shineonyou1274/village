// A running classroom tab may outlive a deployment. Offer a safe reload when its assets change.
(() => {
  const loadedVersion = '__APP_VERSION__';
  if (loadedVersion.startsWith('__')) return; // Local source view; build replaces this marker.

  const banner = document.createElement('div');
  banner.hidden = true;
  banner.setAttribute('role', 'status');
  banner.style.cssText = 'position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:100000;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 20px);padding:9px 12px;border-radius:12px;background:#244d40;color:white;box-shadow:0 5px 20px #17352b55;font:14px system-ui';
  banner.style.display = 'none';
  banner.innerHTML = '<span>새 버전이 준비됐어요. 작업을 마친 뒤 화면을 새로고침해 주세요.</span><button type="button" style="border:0;border-radius:8px;padding:7px 11px;background:#fff;color:#244d40;font:inherit;white-space:nowrap">새 버전 열기</button>';
  document.body.append(banner);
  banner.querySelector('button').onclick = () => {
    if (window.pendingSchoolSave || sessionStorage.getItem('village-pending-command') || (typeof busy !== 'undefined' && busy)) {
      banner.querySelector('span').textContent = '지금 기록을 저장 중이에요. 잠시 뒤 다시 눌러 주세요.';
      return;
    }
    location.reload();
  };

  let checking = false;
  async function checkVersion() {
    if (checking || document.hidden || !navigator.onLine) return;
    checking = true;
    try {
      const response = await fetch('./version.txt?check=' + Date.now(), {cache: 'no-store'});
      if (response.ok) {
        const current = (await response.text()).trim();
        if (current && current !== loadedVersion) {banner.hidden = false; banner.style.display = 'flex';}
      }
    } catch { /* Keep the current game usable while offline. */ }
    finally { checking = false; }
  }
  setInterval(checkVersion, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkVersion(); });
  checkVersion();
})();
