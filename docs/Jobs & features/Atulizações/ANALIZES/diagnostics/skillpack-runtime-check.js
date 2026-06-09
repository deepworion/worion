const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const resultPath = path.join(__dirname, 'skillpack-runtime-check-result.json');

async function run() {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('disable-gpu-rasterization');
  app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.commandLine.appendSwitch('in-process-gpu');
  await app.whenReady();

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  await win.loadFile(path.join(root, 'index.html'));

  const result = await win.webContents.executeJavaScript(`
    (async () => {
      const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
      const waitFor = async (predicate, timeoutMs = 30000) => {
        const started = Date.now();
        while (Date.now() - started < timeoutMs) {
          try {
            if (predicate()) return true;
          } catch {}
          await sleep(250);
        }
        return false;
      };

      const ready = await waitFor(() =>
        typeof buildSystemPrompt === 'function' &&
        typeof loadUserSkillPack === 'function' &&
        typeof userProfile !== 'undefined'
      );

      if (!ready) {
        return { ready: false };
      }

      const pack = loadUserSkillPack();
      const prompt = buildSystemPrompt('Validacao runtime do skill pack.', [], '');
      const marker = '## Skills Pessoais do Usuário';
      const markerIndex = prompt.indexOf(marker);

      return {
        ready: true,
        profile: {
          name: userProfile.name || null,
          displayName: userProfile.displayName || null
        },
        packLoaded: Boolean(pack),
        skillCount: Array.isArray(pack?.skills) ? pack.skills.length : 0,
        semanticLayerLoaded: Boolean(pack?.semanticLayer),
        promptLength: prompt.length,
        hasUserSkillBlock: markerIndex !== -1,
        markerIndex,
        excerpt: markerIndex !== -1 ? prompt.slice(markerIndex, markerIndex + 700) : ''
      };
    })();
  `);

  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
  await app.quit();
}

run().catch(error => {
  fs.writeFileSync(resultPath, JSON.stringify({ fatal: error.message }, null, 2));
  app.quit();
});
