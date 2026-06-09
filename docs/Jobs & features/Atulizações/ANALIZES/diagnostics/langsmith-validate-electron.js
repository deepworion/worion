const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const logPath = path.join(__dirname, 'langsmith-validation-console.log');
const resultPath = path.join(__dirname, 'langsmith-validation-result.json');

function append(line) {
  fs.appendFileSync(logPath, `${new Date().toISOString()} ${line}\n`);
}

async function delay(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  fs.writeFileSync(logPath, '');
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

  const consoleLines = [];
  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const item = { level, message, line, sourceId };
    consoleLines.push(item);
    append(`[renderer:${level}] ${message}`);
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    append(`[renderer-gone] ${JSON.stringify(details)}`);
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

      const output = {
        bootReady: false,
        tracingEnabled: false,
        simple: null,
        agent: null,
        errors: []
      };

      output.bootReady = await waitFor(() =>
        typeof sendMsg === 'function' &&
        typeof startChat === 'function' &&
        Array.isArray(agents) &&
        agents.length > 0 &&
        document.getElementById('main')
      );

      if (!output.bootReady) {
        output.errors.push('Renderer nao ficou pronto para chat.');
        return output;
      }

      output.tracingEnabled = Boolean(
        typeof langSmithTracing !== 'undefined' &&
        langSmithTracing &&
        langSmithTracing.enabled
      );

      const runMessage = async ({ text, forceAgent }) => {
        if (forceAgent) {
          const agent = agents.find(item => item.file === 'worion-assistente.md') || getDefaultAgent();
          currentAgent = agent;
          selected = agent?.id || null;
          window.currentChatSource = 'agent';
          messages = [];
          await startChat({ keepMessages: true, loadHistory: false });
        } else {
          currentAgent = getDefaultAgent();
          selected = currentAgent?.id || null;
          window.currentChatSource = 'home';
          messages = [];
          await startChat({ keepMessages: true, loadHistory: false });
        }

        await waitFor(() => document.getElementById('chat-in'), 10000);
        const input = document.getElementById('chat-in');
        input.value = text;
        await sendMsg();
        await waitFor(() => !isAssistantResponding, 120000);
        const last = messages.filter(item => item.role === 'assistant' && item.content && item.content !== '...').slice(-1)[0];
        return {
          agentId: currentAgent?.id || null,
          agentName: currentAgent?.name || null,
          messageCount: messages.length,
          assistantReply: last?.content || null,
          assistantReplySize: String(last?.content || '').length
        };
      };

      try {
        output.simple = await runMessage({
          text: 'Mensagem de validacao LangSmith: responda apenas ok.',
          forceAgent: false
        });
      } catch (error) {
        output.errors.push('simple: ' + error.message);
      }

      try {
        output.agent = await runMessage({
          text: 'Validacao LangSmith com agente worion-assistente: responda apenas ok.',
          forceAgent: true
        });
      } catch (error) {
        output.errors.push('agent: ' + error.message);
      }

      return output;
    })();
  `);

  fs.writeFileSync(resultPath, JSON.stringify({ result, consoleLines }, null, 2));
  append(`[result] ${JSON.stringify(result)}`);
  await delay(1000);
  await app.quit();
}

run().catch(error => {
  append(`[fatal] ${error.stack || error.message}`);
  fs.writeFileSync(resultPath, JSON.stringify({ fatal: error.message }, null, 2));
  app.quit();
});
