OnHatti neutrale Firmen-PWA – Testpaket

1. Die Dateien dieses Ordners gemeinsam in ein eigenes GitHub-Pages-Repository legen.
2. Die PWA ist beim ersten Start neutral.
3. Im OnHatti Universal-Master die aktive Firma auswählen und "Firmen-Setup für aktive Firma erstellen" verwenden.
4. Das Setup einmal in die neutrale Firmen-PWA importieren.
5. Danach ist diese PWA-Installation lokal fest an genau diese Firma gebunden.

Wichtig:
- Bestehende Firmen-Universal, Nutzer-PWA und APK werden hierfür nicht verändert.
- Der Service Worker löscht nur Caches mit dem Präfix onhatti-firmen-neutral-.
- Zusätzlich hält die Firmen-PWA ihre Offline-index.html in einem eigenen IndexedDB-Speicher. Dadurch bleibt ihr Offline-Start auch dann abgesichert, wenn eine andere PWA derselben GitHub-Domain fremde CacheStorage-Einträge löscht.
