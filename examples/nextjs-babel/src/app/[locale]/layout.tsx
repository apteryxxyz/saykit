import { SayProvider } from '@saykit/react/client';
import type { Say } from 'saykit';
import say, { withSay } from '../../i18n';

export function generateStaticParams() {
  return say.map(([, l]) => ({ locale: l }));
}

async function RootLayout({
  locale,
  messages,
  children,
}: LayoutProps<'/[locale]'> & { locale: string; messages: Say.Messages }) {
  return (
    <html lang={locale}>
      <body>
        <SayProvider locale={locale} messages={messages}>
          {children}
        </SayProvider>
      </body>
    </html>
  );
}

export default withSay(RootLayout, (p) => p.params.then((p) => p.locale));
