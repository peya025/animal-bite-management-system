const code = location.hash.slice(1);
if (/^[A-Za-z0-9]{64}$/.test(code)) document.getElementById('token').value = code;
history.replaceState(null, '', location.pathname);
