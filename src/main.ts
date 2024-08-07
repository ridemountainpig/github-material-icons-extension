import { IconPackValue } from 'material-icon-theme';
import Browser from 'webextension-polyfill';
import { initIconSizes } from './lib/icon-sizes';
import { observePage, replaceAllIcons } from './lib/replace-icons';
import { addConfigChangeListener, getConfig } from './lib/user-config';
import { Provider } from './models';
import { getGitProvider } from './providers';

interface Possibilities {
  [key: string]: string;
}

const init = async () => {
  initIconSizes();
  const { href } = window.location;
  await handleProvider(href);
};

const handleProvider = async (href: string) => {
  const provider: Provider | null = await getGitProvider(href);
  if (!provider) return;

  const iconPack = await getConfig<IconPackValue>('iconPack');
  const extEnabled = await getConfig<boolean>('extEnabled');
  const globalExtEnabled = await getConfig<boolean>('extEnabled', 'default');

  if (!globalExtEnabled || !extEnabled) return;

  observePage(provider, iconPack);
  addConfigChangeListener('iconPack', () => replaceAllIcons(provider));
};

type Handlers = {
  init: () => void;
  guessProvider: (possibilities: Possibilities) => string | null;
};

const handlers: Handlers = {
  init,
  guessProvider: (possibilities: Possibilities): string | null => {
    for (const [name, selector] of Object.entries(possibilities)) {
      if (document.querySelector(selector)) {
        return name;
      }
    }
    return null;
  },
};

Browser.runtime.onMessage.addListener(
  (
    message: { cmd: keyof Handlers; args?: any[] },
    _: Browser.Runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (!handlers[message.cmd]) {
      return sendResponse(null);
    }

    if (message.cmd === 'init') {
      handlers.init();
      return sendResponse(null);
    }

    if (message.cmd === 'guessProvider') {
      const result = handlers[message.cmd](
        (message.args || [])[0] as unknown as Possibilities
      );
      return sendResponse(result);
    }
  }
);

init();
