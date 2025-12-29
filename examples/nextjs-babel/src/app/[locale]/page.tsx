import { withSay } from '../../i18n';
import ClientComponent from './client-component';
import ServerComponent from './server-component';

function HomePage(_: PageProps<'/[locale]'>) {
  return (
    <main>
      <div style={{ border: '1px solid red' }}>
        <ServerComponent />
      </div>

      <div style={{ border: '1px solid blue' }}>
        <ClientComponent />
      </div>
    </main>
  );
}

export default withSay(HomePage, (p) => p.params.then((p) => p.locale));
